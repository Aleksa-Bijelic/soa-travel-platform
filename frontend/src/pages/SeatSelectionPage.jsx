import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import {
  buildSeatRows,
  rowLabel,
  categoryLabel,
  formatEventDate,
} from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

const MAX_TICKETS = 10;

function seatSize(capacity) {
  if (capacity <= 30) return { box: 38, font: 13 };
  if (capacity <= 80) return { box: 32, font: 12 };
  if (capacity <= 240) return { box: 23, font: 9 };
  return { box: 20, font: 8 };
}

export default function SeatSelectionPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [ticketCount, setTicketCount] = useState(1);
  const [selected, setSelected] = useState([]);
  const [reserving, setReserving] = useState(false);
  const [result, setResult] = useState(null);

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => reservationApi.getEvent(id, token),
  });

  const seatsQueryKey = ['seats', id];
  const { data: seats = [], isLoading: seatsLoading } = useQuery({
    queryKey: seatsQueryKey,
    queryFn: () => reservationApi.getSeats(id, token),
  });

  const taken = useMemo(() => {
    const set = new Set();
    (seats || []).forEach((s) => {
      if (s.status === 'pending' || s.status === 'confirmed') set.add(s.seat_number);
    });
    return set;
  }, [seats]);

  const layout = useMemo(
    () => (event ? buildSeatRows(event.max_capacity) : { rows: [], cols: 0, rowCount: 0 }),
    [event],
  );
  const size = useMemo(() => (event ? seatSize(event.max_capacity) : { box: 32, font: 12 }), [event]);

  if (eventLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (eventError) return <div className="container" style={{ padding: 40 }}><ErrBanner>{eventError.message}</ErrBanner></div>;
  if (!event) return null;

  // Guided sessions book by headcount, not by seat.
  if (event.event_type === 'tour_session') {
    navigate(`/events/${id}/book`, { replace: true });
    return null;
  }

  const maxTickets = Math.max(1, Math.min(MAX_TICKETS, event.available_spots));
  const soldOut = event.status === 'full' || event.available_spots <= 0;

  const toggleSeat = (seat) => {
    if (taken.has(seat) || reserving) return;
    setSelected((sel) => {
      if (sel.includes(seat)) return sel.filter((s) => s !== seat);
      if (sel.length >= ticketCount) return sel;
      return [...sel, seat].sort((a, b) => a - b);
    });
  };

  const changeCount = (n) => {
    const clamped = Math.max(1, Math.min(maxTickets, n));
    setTicketCount(clamped);
    setSelected((sel) => sel.slice(0, clamped));
  };

  const addToCart = async (reservation, seat) => {
    const res = await fetch('/purchase/cart/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        reservation_id: reservation.id,
        event_id: reservation.event_id,
        event_name: reservation.event_name,
        seat_number: seat,
        price: reservation.price_per_person,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to add reservation to cart');
    }
  };

  const handleReserve = async () => {
    if (selected.length !== ticketCount || reserving) return;
    setReserving(true);
    setResult(null);
    // Re-read the seat map first: the backend is the source of truth and
    // anything taken meanwhile is reported instead of failing blindly.
    let freshTaken = taken;
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: seatsQueryKey,
        queryFn: () => reservationApi.getSeats(id, token),
      });
      freshTaken = new Set(
        (fresh || [])
          .filter((s) => s.status === 'pending' || s.status === 'confirmed')
          .map((s) => s.seat_number),
      );
    } catch {
      // Fall through with the last known state; the server still guards us.
    }

    const ok = [];
    const failed = [];
    for (const seat of selected) {
      if (freshTaken.has(seat)) {
        failed.push({ seat, error: 'just taken by someone else' });
        continue;
      }
      try {
        const data = await reservationApi.reserveSeat(id, seat, token);
        try {
          await addToCart(data, seat);
        } catch (cartErr) {
          failed.push({ seat, error: `reserved but cart failed: ${cartErr.message}` });
          continue;
        }
        ok.push(seat);
      } catch (e) {
        failed.push({ seat, error: e.message });
      }
    }

    const failedSeats = new Set(failed.map((f) => f.seat));
    setSelected((sel) => sel.filter((s) => !ok.includes(s) && !failedSeats.has(s)));
    setResult({ ok, failed });
    queryClient.invalidateQueries({ queryKey: seatsQueryKey });
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    setReserving(false);
  };

  const total = selected.length * (event.price_per_person || 0);

  return (
    <div className="container" style={{ padding: '40px 0 80px', maxWidth: 920, margin: '0 auto' }}>
      <button onClick={() => navigate(`/events/${id}`)} style={{
        background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', gap: 4, color: 'var(--ink-soft)', fontSize: 13, marginBottom: 20,
      }}>
        <Icon d={ICONS.chevL} size={14} /> Back to event
      </button>

      <div style={{ marginBottom: 22 }}>
        <span className="eyebrow">{categoryLabel(event)}</span>
        <h1 style={{ marginTop: 6 }}>{event.name}</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {event.location}{event.city ? `, ${event.city}` : ''} · {formatEventDate(event.event_date)} ·{' '}
          {event.price_per_person?.toFixed(2)} € per seat
        </p>
      </div>

      {soldOut ? (
        <div className="card p-32" style={{ textAlign: 'center' }}>
          <Icon d={ICONS.lock} size={32} style={{ color: 'var(--terracotta)' }} />
          <h3 style={{ marginTop: 12 }}>This event is fully booked</h3>
        </div>
      ) : user?.role !== 'tourist' ? (
        <div className="card p-24" style={{ background: 'var(--paper-deep)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
            Only tourists can reserve seats. The hall layout is shown below for preview.
          </p>
        </div>
      ) : (
        <div className="card p-24 fade-up" style={{ marginBottom: 20 }}>
          <div className="row between wrap" style={{ alignItems: 'center', gap: 12 }}>
            <div>
              <span className="eyebrow">Tickets</span>
              <div className="row gap-8" style={{ alignItems: 'center', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => changeCount(ticketCount - 1)}
                  disabled={ticketCount <= 1 || reserving}>−</button>
                <span style={{ fontWeight: 700, fontSize: 20, minWidth: 28, textAlign: 'center' }}>{ticketCount}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => changeCount(ticketCount + 1)}
                  disabled={ticketCount >= maxTickets || reserving}>+</button>
                <span className="faint" style={{ fontSize: 12 }}>max {maxTickets}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="eyebrow">Selected</span>
              <div style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                {selected.length} / {ticketCount} · {total.toFixed(2)} €
              </div>
            </div>
          </div>
          <div className="row gap-16 wrap" style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
            <Legend sw={{ background: 'var(--paper)', border: '2px solid var(--sage-line)' }} label="Available" />
            <Legend sw={{ background: 'var(--sage-deep)' }} label="Selected" />
            <Legend sw={{ background: 'var(--ink-faint)' }} label="Taken" />
            <span className="faint" style={{ marginLeft: 'auto' }}>
              {event.available_spots} of {event.max_capacity} seats free
            </span>
          </div>
        </div>
      )}

      <div className="card fade-up" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '28px 20px 8px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '62%', height: 10, borderRadius: 6, background: 'var(--sage-deep)', opacity: 0.35 }} />
        </div>

        <div style={{ padding: '16px 20px 28px', overflowX: 'auto' }}>
          {seatsLoading ? (
            <div style={{ padding: 30, textAlign: 'center' }}>Loading seats…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: size.box > 28 ? 8 : 5, minWidth: 'fit-content', margin: '0 auto', width: 'fit-content' }}>
              {layout.rows.map((row, ri) => {
                const mid = Math.ceil(row.length / 2);
                const left = row.slice(0, mid);
                const right = row.slice(mid);
                // The right spacer mirrors the row label so the middle aisle
                // stays exactly centered under the stage line.
                return (
                  <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="faint" style={{ width: 20, fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                      {rowLabel(ri)}
                    </span>
                    <div style={{ display: 'flex', gap: size.box > 28 ? 7 : 5 }}>
                      {left.map((seat) => (
                        <Seat key={seat} seat={seat} taken={taken.has(seat)}
                          isSelected={selected.includes(seat)} size={size}
                          disabled={user?.role !== 'tourist' || reserving}
                          onClick={() => toggleSeat(seat)} />
                      ))}
                    </div>
                    <div style={{ width: size.box * 0.8 }} />
                    <div style={{ display: 'flex', gap: size.box > 28 ? 7 : 5 }}>
                      {right.map((seat) => (
                        <Seat key={seat} seat={seat} taken={taken.has(seat)}
                          isSelected={selected.includes(seat)} size={size}
                          disabled={user?.role !== 'tourist' || reserving}
                          onClick={() => toggleSeat(seat)} />
                      ))}
                    </div>
                    <span style={{ width: 20 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {user?.role === 'tourist' && !soldOut && (
        <div className="card p-20 fade-up" style={{ marginTop: 20 }}>
          {result && (
            <div style={{ marginBottom: 14 }}>
              {result.ok.length > 0 && (
                <div className="card p-16" style={{ background: 'var(--sage-deep)', color: '#fff', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    Reserved seat{result.ok.length !== 1 ? 's' : ''} {result.ok.join(', ')} — added to your cart.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                    Complete checkout within 5 minutes to confirm.
                  </p>
                </div>
              )}
              {result.failed.length > 0 && (
                <ErrBanner>
                  Could not reserve seat{result.failed.length !== 1 ? 's' : ''}{' '}
                  {result.failed.map((f) => f.seat).join(', ')}: {result.failed[0].error}.
                  Someone else may have taken {result.failed.length !== 1 ? 'them' : 'it'} just now — the map above is refreshed.
                </ErrBanner>
              )}
              {result.ok.length > 0 && (
                <Btn variant="primary" size="lg" icon="cart" onClick={() => navigate('/cart')}
                  style={{ width: '100%', marginTop: 4 }}>
                  Go to Cart to Pay
                </Btn>
              )}
            </div>
          )}
          <Btn variant="primary" size="lg" style={{ width: '100%' }}
            disabled={selected.length !== ticketCount || reserving}
            onClick={handleReserve}>
            {reserving
              ? 'Reserving…'
              : selected.length === ticketCount
                ? `Reserve ${ticketCount} seat${ticketCount !== 1 ? 's' : ''} — ${total.toFixed(2)} €`
                : `Select ${ticketCount - selected.length} more seat${ticketCount - selected.length !== 1 ? 's' : ''}`}
          </Btn>
          <p className="faint" style={{ fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
            Seats are reserved one by one on the server — if another visitor takes a seat first, you keep the rest and see exactly which one was lost.
          </p>
        </div>
      )}
    </div>
  );
}

function Legend({ sw, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 14, height: 14, borderRadius: 4, display: 'inline-block',
        ...sw,
      }} /> {label}
    </span>
  );
}

function Seat({ seat, taken: isTaken, isSelected, size, disabled, onClick }) {
  return (
    <button disabled={isTaken || disabled}
      onClick={onClick}
      title={`Seat ${seat}`}
      style={{
        width: size.box, height: size.box,
        borderRadius: `${Math.round(size.box * 0.38)}px ${Math.round(size.box * 0.38)}px 4px 4px`,
        border: `2px solid ${isSelected ? 'var(--sage-deep)' : isTaken ? 'var(--ink-faint)' : 'var(--sage-line)'}`,
        background: isTaken ? 'var(--ink-faint)' : isSelected ? 'var(--sage-deep)' : 'var(--paper)',
        color: isTaken ? 'rgba(255,255,255,.55)' : isSelected ? '#fff' : 'var(--ink)',
        cursor: isTaken || disabled ? 'not-allowed' : 'pointer',
        fontSize: size.font, fontWeight: 600, transition: 'all .12s',
        padding: 0, lineHeight: 1,
      }}>
      {seat}
    </button>
  );
}
