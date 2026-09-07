import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import { api as tourApi } from '../api/tourApi';
import { categoryLabel, formatEventDate } from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

const MAX_PEOPLE = 10;

// Booking for guided tour sessions: no seat picking — just how many people.
// Each person becomes one reservation row, created sequentially so a race
// on the last spots reports exactly how many went through.
export default function SessionBookingPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [people, setPeople] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [result, setResult] = useState(null);

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => reservationApi.getEvent(id, token),
  });

  const tourId = event?.tour_id;
  const {
    data: purchaseStatus,
    isLoading: purchaseLoading,
    error: purchaseError,
    refetch: refetchPurchase,
  } = useQuery({
    queryKey: ['purchase-status', tourId],
    queryFn: () => tourApi.getPurchaseStatus(tourId, token),
    enabled: Boolean(tourId && token && event?.event_type === 'tour_session'),
    retry: 1,
  });
  const hasPurchased = purchaseStatus?.purchased === true;

  // Required tour info (name + link) so travellers can verify they bought the right tour.
  const { data: requiredTour } = useQuery({
    queryKey: ['public-tour', tourId],
    queryFn: () => tourApi.getPublicTour(tourId, token),
    enabled: Boolean(tourId && token && event?.event_type === 'tour_session'),
    staleTime: 60_000,
  });

  if (eventLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (eventError) return <div className="container" style={{ padding: 40 }}><ErrBanner>{eventError.message}</ErrBanner></div>;
  if (!event) return null;

  // Activities have their own seat-map page.
  if (event.event_type === 'activity') {
    navigate(`/events/${id}/seats`, { replace: true });
    return null;
  }

  const maxPeople = Math.max(1, Math.min(MAX_PEOPLE, event.available_spots));
  const soldOut = event.status === 'full' || event.available_spots <= 0;
  const total = people * (event.price_per_person || 0);

  const changeCount = (n) => setPeople(Math.max(1, Math.min(maxPeople, n)));

  const addToCart = async (reservation) => {
    const res = await fetch('/purchase/cart/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        reservation_id: reservation.id,
        event_id: reservation.event_id,
        event_name: reservation.event_name,
        seat_number: null,
        price: reservation.price_per_person,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to add reservation to cart');
    }
  };

  const handleReserve = async () => {
    if (reserving) return;
    setReserving(true);
    setResult(null);
    let ok = 0;
    let failedError = null;
    for (let i = 0; i < people; i++) {
      try {
        const data = await reservationApi.reserveSeat(id, null, token);
        try {
          await addToCart(data);
        } catch (cartErr) {
          failedError = `reserved but cart failed: ${cartErr.message}`;
          break;
        }
        ok++;
      } catch (e) {
        failedError = e.message;
        break;
      }
    }
    setResult({ ok, failed: people - ok, error: failedError });
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    setReserving(false);
  };

  return (
    <div className="container" style={{ padding: '40px 0 80px', maxWidth: 640, margin: '0 auto' }}>
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
          {event.price_per_person?.toFixed(2)} € per person
        </p>
        {requiredTour?.name && (
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Session of the tour{' '}
            <span
              onClick={() => tourId && navigate(`/browse/${tourId}`)}
              style={{ fontWeight: 700, color: 'var(--sage-deep)', cursor: 'pointer' }}>
              {requiredTour.name}
            </span>
          </p>
        )}
      </div>

      {soldOut ? (
        <div className="card p-32" style={{ textAlign: 'center' }}>
          <Icon d={ICONS.lock} size={32} style={{ color: 'var(--terracotta)' }} />
          <h3 style={{ marginTop: 12 }}>This session is fully booked</h3>
        </div>
      ) : user?.role !== 'tourist' ? (
        <div className="card p-24" style={{ background: 'var(--paper-deep)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
            Only tourists can reserve spots.
          </p>
        </div>
      ) : purchaseLoading ? (
        <div className="card p-24">Checking your purchases…</div>
      ) : !tourId ? (
        <div className="card p-24 fade-up">
          <ErrBanner>
            This session is not linked to a tour — please contact the guide. (Missing tour link on the session.)
          </ErrBanner>
        </div>
      ) : purchaseError ? (
        <div className="card p-24 fade-up">
          <ErrBanner>
            Could not check your purchases: {purchaseError.message}
          </ErrBanner>
          <Btn variant="primary" size="sm" onClick={() => refetchPurchase()} style={{ marginTop: 12 }}>
            Try Again
          </Btn>
        </div>
      ) : !hasPurchased ? (
        <div className="card p-24 fade-up" style={{ textAlign: 'center' }}>
          <Icon d={ICONS.lock} size={28} style={{ color: 'var(--gold)' }} />
          <h3 style={{ marginTop: 12 }}>Purchase the tour first</h3>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            This session belongs to the tour{' '}
            <strong>{requiredTour?.name || 'linked below'}</strong>. Guided sessions are
            available only to travellers who already bought that tour — if you bought it
            under a different tour with a similar name, that purchase does not apply here.
          </p>
          {tourId && (
            <Btn variant="primary" iconRight="arrow" onClick={() => navigate(`/browse/${tourId}`)}
              style={{ marginTop: 16 }}>
              View the Tour
            </Btn>
          )}
        </div>
      ) : (
        <div className="card p-24 fade-up">
          <div className="row between wrap" style={{ alignItems: 'center', gap: 12 }}>
            <div>
              <span className="eyebrow">People</span>
              <div className="row gap-8" style={{ alignItems: 'center', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => changeCount(people - 1)}
                  disabled={people <= 1 || reserving}>−</button>
                <span style={{ fontWeight: 700, fontSize: 20, minWidth: 28, textAlign: 'center' }}>{people}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => changeCount(people + 1)}
                  disabled={people >= maxPeople || reserving}>+</button>
                <span className="faint" style={{ fontSize: 12 }}>max {maxPeople}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="eyebrow">Total</span>
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 8 }}>{total.toFixed(2)} €</div>
            </div>
          </div>
          <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
            {event.available_spots} of {event.max_capacity} spots free. No seat picking on guided tours —
            spots are filled up to capacity.
          </p>

          {result && (
            <div style={{ marginTop: 14 }}>
              {result.ok > 0 && (
                <div className="card p-16" style={{ background: 'var(--sage-deep)', color: '#fff', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    Reserved {result.ok} spot{result.ok !== 1 ? 's' : ''} — added to your cart.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                    Complete checkout within 5 minutes to confirm.
                  </p>
                </div>
              )}
              {result.failed > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <ErrBanner>
                    {result.ok > 0
                      ? `Only ${result.ok} spot${result.ok !== 1 ? 's' : ''} went through — the session filled up meanwhile: ${result.error}`
                      : `Could not reserve: ${result.error}`}
                  </ErrBanner>
                </div>
              )}
            </div>
          )}

          {result?.ok > 0 ? (
            <Btn variant="primary" size="lg" icon="cart" onClick={() => navigate('/cart')}
              style={{ width: '100%', marginTop: 4 }}>
              Go to Cart to Pay
            </Btn>
          ) : (
            <Btn variant="primary" size="lg" style={{ width: '100%', marginTop: result ? 0 : 14 }}
              disabled={reserving} onClick={handleReserve}>
              {reserving ? 'Reserving…' : `Reserve ${people} spot${people !== 1 ? 's' : ''} — ${total.toFixed(2)} €`}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
