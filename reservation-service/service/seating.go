package service

// Cinema-style seating: hall layouts and best-available-seat fallback.
//
// Layouts mirror frontend buildSeatRows (utils/eventCategories.js) so seat
// numbers mean the same on both sides: row-major 1..N, rows as even as
// possible. Selectable activity capacities divide evenly:
//
//	30  -> 5 rows x 6    80  -> 8 x 10
//	240 -> 15 x 16       400 -> 20 x 20
//
// Anything else (legacy events, tour sessions) falls back to 10 columns
// with evenly spread rows — same rule as the frontend.
//
// Fallback rule: when the requested seat is taken, assign the nearest free
// seat, ordered by (row distance, column distance, distance to row center,
// row, column). Same-row neighbours win first; ties break toward the middle
// of the row (the better cinema seat), then deterministically. Runs inside
// the ReserveSeat event lock, so simultaneous losers are placed one by one,
// each seeing the previous loser's pick.

// Selectable activity capacities and their hall geometry.
var activityHallLayouts = map[int]struct{ rows, cols int }{
	30:  {rows: 5, cols: 6},
	80:  {rows: 8, cols: 10},
	240: {rows: 15, cols: 16},
	400: {rows: 20, cols: 20},
}

// hallRows builds the seat-number grid for a capacity, row-major 1..N.
func hallRows(capacity int) [][]int {
	var rows int
	if layout, ok := activityHallLayouts[capacity]; ok {
		rows = layout.rows
	} else {
		rows = (capacity + 9) / 10
		if rows < 1 {
			rows = 1
		}
	}
	base := capacity / rows
	extra := capacity % rows
	grid := make([][]int, 0, rows)
	n := 1
	for r := 0; r < rows; r++ {
		count := base
		if r < extra {
			count++
		}
		row := make([]int, 0, count)
		for i := 0; i < count; i++ {
			row = append(row, n)
			n++
		}
		grid = append(grid, row)
	}
	return grid
}

// seatPos locates a seat number in the grid (0-based row/col).
func seatPos(grid [][]int, seat int) (row, col int, ok bool) {
	for r, rowSeats := range grid {
		for c, s := range rowSeats {
			if s == seat {
				return r, c, true
			}
		}
	}
	return 0, 0, false
}

// bestAvailableSeat picks the nearest free seat to the requested one.
// taken holds occupied seat numbers. Returns false when the hall is full.
func bestAvailableSeat(capacity, requested int, taken map[int]bool) (int, bool) {
	grid := hallRows(capacity)
	reqRow, reqCol, ok := seatPos(grid, requested)
	if !ok {
		return 0, false
	}
	best := 0
	found := false
	var bestScore [4]float64
	for r, rowSeats := range grid {
		center := float64(len(rowSeats)-1) / 2
		for c, s := range rowSeats {
			if taken[s] {
				continue
			}
			dr := abs(r - reqRow)
			dc := abs(c - reqCol)
			central := absFloat(float64(c) - center)
			score := [4]float64{float64(dr), float64(dc), central, float64(s)}
			if !found || lessScore(score, bestScore) {
				best, bestScore, found = s, score, true
			}
		}
	}
	return best, found
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func absFloat(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func lessScore(a, b [4]float64) bool {
	for i := range a {
		if a[i] != b[i] {
			return a[i] < b[i]
		}
	}
	return false
}
