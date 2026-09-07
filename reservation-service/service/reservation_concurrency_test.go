package service

// Concurrency / race-condition tests for the reservation flow.
//
// What they prove:
//  1. Same-seat race: N tourists click the same seat at the same instant —
//     exactly one gets it, the rest are placed on the nearest free seats
//     (cinema-style fallback), all distinct, nobody empty-handed while the
//     hall has room. Serialization comes from the SELECT FOR UPDATE event
//     lock, with the partial unique index ux_reservation_event_seat_active
//     as the final backstop.
//  2. Fallback determinism: taken seat 5 -> 4, then 4+5 taken -> 6.
//  3. Capacity race: more tourists than spots — total successes never exceed
//     max_capacity and the event flips to "full".
//  4. Guided-tour headcount race (no seats): same guarantee via the lock +
//     capacity count.
//
// How to run (needs the dev Postgres reachable, e.g. `docker compose up -d
// reservation-db`, which maps 5437 -> 5432):
//
//   cd reservation-service
//   DB_HOST=localhost DB_PORT=5437 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=reservation go test ./service/ -run 'TestConcurrent' -v -count=1
//
// The tests create events named "load-test-*" and delete them (plus their
// reservations) afterwards. If the DB is unreachable the tests skip instead
// of failing, so plain `go test ./...` stays green anywhere.

import (
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"example.com/reservation-service/dto"
	"example.com/reservation-service/model"
	"example.com/reservation-service/repo"
)

func testEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func setupRaceService(t *testing.T) (*ReservationService, *gorm.DB) {
	t.Helper()

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		testEnv("DB_HOST", "localhost"),
		testEnv("DB_PORT", "5437"),
		testEnv("DB_USER", "postgres"),
		testEnv("DB_PASSWORD", "postgres"),
		testEnv("DB_NAME", "reservation"),
		testEnv("DB_SSLMODE", "disable"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("postgres not reachable (%v) — start it with `docker compose up -d reservation-db`", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	sqlDB.SetMaxOpenConns(30)

	if err := db.AutoMigrate(&model.Event{}, &model.TourSession{}, &model.Activity{}, &model.Reservation{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// Same seat backstop as production (see main.go initDatabase).
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS ux_reservation_event_seat_active
		ON reservations(event_id, seat_number) WHERE status IN ('pending','confirmed') AND seat_number IS NOT NULL`)

	return &ReservationService{
		EventRepo:       &repo.EventRepository{DB: db},
		ReservationRepo: &repo.ReservationRepository{DB: db},
		TourSessionRepo: &repo.TourSessionRepository{DB: db},
		ActivityRepo:    &repo.ActivityRepository{DB: db},
		DB:              db,
	}, db
}

func createRaceActivity(t *testing.T, db *gorm.DB, capacity int) uuid.UUID {
	t.Helper()
	ev := &model.Event{
		ID:             uuid.New(),
		EventType:      model.EventActivity,
		Name:           fmt.Sprintf("load-test-activity-%s", uuid.NewString()[:8]),
		Description:    "concurrency test",
		Location:       "Test hall",
		City:           "Test City",
		EventDate:      time.Now().Add(48 * time.Hour),
		MaxCapacity:    capacity,
		PricePerPerson: 10,
		Status:         model.EventScheduled,
	}
	if err := db.Create(ev).Error; err != nil {
		t.Fatalf("create event: %v", err)
	}
	if err := db.Create(&model.Activity{EventID: ev.ID, ActivityType: model.ActivityConcert}).Error; err != nil {
		t.Fatalf("create activity: %v", err)
	}
	return ev.ID
}

func createRaceSession(t *testing.T, db *gorm.DB, capacity int) uuid.UUID {
	t.Helper()
	ev := &model.Event{
		ID:             uuid.New(),
		EventType:      model.EventTourSession,
		Name:           fmt.Sprintf("load-test-session-%s", uuid.NewString()[:8]),
		Description:    "concurrency test",
		Location:       "Test square",
		City:           "Test City",
		EventDate:      time.Now().Add(48 * time.Hour),
		MaxCapacity:    capacity,
		PricePerPerson: 5,
		Status:         model.EventScheduled,
	}
	if err := db.Create(ev).Error; err != nil {
		t.Fatalf("create event: %v", err)
	}
	if err := db.Create(&model.TourSession{EventID: ev.ID, TourID: "load-test-tour", GuideID: "load-test-guide"}).Error; err != nil {
		t.Fatalf("create session: %v", err)
	}
	return ev.ID
}

func cleanupRaceEvent(t *testing.T, db *gorm.DB, eventID uuid.UUID) {
	t.Helper()
	db.Where("event_id = ?", eventID).Delete(&model.Reservation{})
	db.Where("event_id = ?", eventID).Delete(&model.Activity{})
	db.Where("event_id = ?", eventID).Delete(&model.TourSession{})
	db.Where("id = ?", eventID).Delete(&model.Event{})
}

func countActive(t *testing.T, db *gorm.DB, eventID uuid.UUID, seat *int) int64 {
	t.Helper()
	var c int64
	q := db.Model(&model.Reservation{}).
		Where("event_id = ? AND status IN ?", eventID, []string{"pending", "confirmed"})
	if seat != nil {
		q = q.Where("seat_number = ?", *seat)
	}
	if err := q.Count(&c).Error; err != nil {
		t.Fatalf("count: %v", err)
	}
	return c
}

func TestConcurrentSameSeat(t *testing.T) {
	svc, db := setupRaceService(t)
	eventID := createRaceActivity(t, db, 30)
	defer cleanupRaceEvent(t, db, eventID)

	// With the nearest-seat fallback, N tourists clicking the same seat at
	// the same instant must ALL succeed: one gets the requested seat, the
	// rest spread deterministically around it — nobody leaves empty-handed
	// while the hall has free spots.
	const racers = 25
	seat := 5
	assigned := make([]int, 0, racers)
	var mu sync.Mutex
	var denied int64
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < racers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			res, err := svc.ReserveSeat(eventID, fmt.Sprintf("race-tourist-%d", i), dto.ReserveRequest{SeatNumber: &seat})
			if err == nil {
				mu.Lock()
				assigned = append(assigned, *res.SeatNumber)
				mu.Unlock()
			} else {
				atomic.AddInt64(&denied, 1)
				t.Logf("racer %d denied: %v", i, err)
			}
		}(i)
	}
	close(start)
	wg.Wait()

	if len(assigned) != racers {
		t.Fatalf("same-seat race: %d winners, want all %d (denied=%d)", len(assigned), racers, denied)
	}
	seen := map[int]bool{}
	gotRequested := 0
	for _, s := range assigned {
		if seen[s] {
			t.Fatalf("seat %d assigned twice", s)
		}
		seen[s] = true
		if s == seat {
			gotRequested++
		}
	}
	if gotRequested != 1 {
		t.Fatalf("requested seat %d assigned %d times, want exactly 1", seat, gotRequested)
	}
	if got := countActive(t, db, eventID, &seat); got != 1 {
		t.Fatalf("seat %d has %d active reservations, want 1", seat, got)
	}
	t.Logf("same-seat race OK: 1 got seat %d, %d spread nearby, 0 empty-handed", seat, racers-1)
}

func TestSeatFallbackDeterministic(t *testing.T) {
	svc, db := setupRaceService(t)
	eventID := createRaceActivity(t, db, 30) // 5 rows x 6
	defer cleanupRaceEvent(t, db, eventID)

	// Occupy seat 5 (row 1, near the middle).
	seat := 5
	if _, err := svc.ReserveSeat(eventID, "fallback-first", dto.ReserveRequest{SeatNumber: &seat}); err != nil {
		t.Fatalf("setup reservation: %v", err)
	}
	// Next tourist asking for 5 must get seat 4: same row, adjacent, and
	// closer to the row center than the other adjacent seat 6.
	res, err := svc.ReserveSeat(eventID, "fallback-second", dto.ReserveRequest{SeatNumber: &seat})
	if err != nil {
		t.Fatalf("fallback reservation: %v", err)
	}
	if res.SeatNumber == nil || *res.SeatNumber != 4 {
		t.Fatalf("fallback assigned seat %v, want 4", res.SeatNumber)
	}
	// Seats 4 and 5 taken now: asking for 5 must give seat 6
	// (same row, one column away beats two columns away).
	res, err = svc.ReserveSeat(eventID, "fallback-third", dto.ReserveRequest{SeatNumber: &seat})
	if err != nil {
		t.Fatalf("second fallback reservation: %v", err)
	}
	if res.SeatNumber == nil || *res.SeatNumber != 6 {
		t.Fatalf("second fallback assigned seat %v, want 6", res.SeatNumber)
	}
	t.Logf("fallback deterministic OK: 5 taken -> 4, then 4+5 taken -> 6")
}

func TestConcurrentCapacity(t *testing.T) {
	svc, db := setupRaceService(t)
	const capacity = 5
	eventID := createRaceActivity(t, db, capacity)
	defer cleanupRaceEvent(t, db, eventID)

	const racers = 20
	var wins int64
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < racers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			seat := (i % capacity) + 1
			if _, err := svc.ReserveSeat(eventID, fmt.Sprintf("cap-tourist-%d", i), dto.ReserveRequest{SeatNumber: &seat}); err == nil {
				atomic.AddInt64(&wins, 1)
			}
		}(i)
	}
	close(start)
	wg.Wait()

	if wins != capacity {
		t.Fatalf("capacity race: %d successes, want exactly %d", wins, capacity)
	}
	for s := 1; s <= capacity; s++ {
		seat := s
		if got := countActive(t, db, eventID, &seat); got != 1 {
			t.Fatalf("seat %d has %d active reservations, want 1", s, got)
		}
	}
	var ev model.Event
	if err := db.Where("id = ?", eventID).First(&ev).Error; err != nil {
		t.Fatalf("reload event: %v", err)
	}
	if ev.Status != model.EventFull {
		t.Fatalf("event status = %s, want full", ev.Status)
	}
	t.Logf("capacity race OK: %d/20 went through, no double-booked seat, event is full", wins)
}

func TestConcurrentGuidedTourHeadcount(t *testing.T) {
	svc, db := setupRaceService(t)
	const capacity = 3
	eventID := createRaceSession(t, db, capacity)
	defer cleanupRaceEvent(t, db, eventID)

	const racers = 10
	var wins int64
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < racers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			// NOTE: PurchaseClient is nil in tests, so the purchase gate
			// fail-opens (returns purchased=true) — production wires the
			// real purchase-service gRPC client.
			res, err := svc.ReserveSeat(eventID, fmt.Sprintf("session-tourist-%d", i), dto.ReserveRequest{})
			if err == nil {
				if res.SeatNumber != nil {
					t.Errorf("session reservation should carry no seat number")
				}
				atomic.AddInt64(&wins, 1)
			}
		}(i)
	}
	close(start)
	wg.Wait()

	if wins != capacity {
		t.Fatalf("session race: %d successes, want exactly %d", wins, capacity)
	}
	if got := countActive(t, db, eventID, nil); got != capacity {
		t.Fatalf("event has %d active reservations, want %d", got, capacity)
	}
	t.Logf("session race OK: %d/10 went through, capacity respected", wins)
}
