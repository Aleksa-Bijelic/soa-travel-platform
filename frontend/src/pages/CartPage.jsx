import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/tourApi';
import { reservationApi } from '../api/reservationApi';
import { useAuth } from '../context/AuthContext';
import { categoryLabel, eventCover } from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

export default function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['purchase-cart'],
    queryFn: () => api.getCart(token),
    enabled: Boolean(token),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Covers: published tours for tour items, events for reservation items.
  const { data: published = [] } = useQuery({
    queryKey: ['published-tours'],
    queryFn: () => api.getPublishedTours(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => reservationApi.getEvents(token, {}),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const tourCovers = useMemo(() => {
    const map = {};
    (published || []).forEach((t) => {
      if (t?.firstKeyPoint?.imageUrl) map[t.id] = t.firstKeyPoint.imageUrl;
    });
    return map;
  }, [published]);
  const eventInfo = useMemo(() => {
    const map = {};
    (events || []).forEach((ev) => { map[ev.id] = ev; });
    return map;
  }, [events]);

  // Fallback for cart items created before reservation_event_id existed:
  // resolve the event through the reservation itself.
  const { data: reservationsData } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationApi.getMyReservations(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
  const reservationEvents = useMemo(() => {
    const map = {};
    (reservationsData || []).forEach((r) => { map[r.id] = r.event_id; });
    return map;
  }, [reservationsData]);

  const checkoutMut = useMutation({
    mutationFn: () => api.checkoutCart(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-cart'] });
      qc.invalidateQueries({ queryKey: ['public-tour'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (itemId) => api.removeCartItem(itemId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-cart'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (error) return <div className="container" style={{ padding: 40 }}><ErrBanner>{error.message}</ErrBanner></div>;

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/browse')} style={{ marginBottom: 16 }}>
        Back to browsing
      </button>

      <div className="card p-24 fade-up" style={{ marginBottom: 20 }}>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <div>
            <span className="eyebrow">Shopping cart</span>
            <h1 style={{ marginTop: 4 }}>Your cart</h1>
          </div>
          <Btn variant="primary" onClick={() => checkoutMut.mutate()} disabled={!cart?.items.length || checkoutMut.isLoading}>
            {checkoutMut.isLoading ? 'Processing…' : 'Checkout'}
          </Btn>
        </div>

        {checkoutMut.isError && (
          <div style={{ marginTop: 16 }}><ErrBanner>{checkoutMut.error.message}</ErrBanner></div>
        )}

        <div style={{ marginTop: 20 }}>
          {cart?.items.length === 0 ? (
            <div className="empty" style={{ padding: 22 }}>
              <h3>Your cart is empty</h3>
              <p>Add a tour from browse to start buying.</p>
            </div>
          ) : (
            <div className="col gap-16">
              {cart.items.map((item, i) => {
                const isReservation = item.item_type === 'reservation';
                const evId = item.reservation_event_id || reservationEvents[item.reservation_id];
                const ev = isReservation ? eventInfo[evId] : null;
                const src = isReservation
                  ? (ev ? eventCover(ev) : null)
                  : (item.tour_id ? tourCovers[item.tour_id] : null);
                return (
                  <div key={item.id} className="card fade-up" style={{
                    display: 'grid', gridTemplateColumns: '170px 1fr auto',
                    gap: 0, overflow: 'hidden', animationDelay: `${i * 40}ms`,
                  }}>
                    <ItemCover src={src} label={item.tour_name} />
                    <div className="col gap-8" style={{ minWidth: 0, padding: 16 }}>
                      <div className="row gap-8 wrap" style={{ alignItems: 'center' }}>
                        <span className="badge" style={{
                          background: isReservation ? 'var(--gold)' : 'var(--sage-deep)',
                          color: '#fff', fontSize: 11,
                        }}>
                          {isReservation ? (ev ? categoryLabel(ev) : 'Reservation') : 'Tour'}
                        </span>
                        {isReservation && item.seat_number != null && (
                          <span className="badge" style={{ background: 'var(--paper-deep)', color: 'var(--ink-soft)', fontSize: 11 }}>
                            Seat #{item.seat_number}
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: 17 }}>{item.tour_name}</h3>
                      <p className="muted" style={{
                        fontSize: 13.5, lineHeight: 1.55, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {item.tour_description || 'No description available.'}
                      </p>
                      {isReservation && ev?.city && (
                        <span className="faint" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={ICONS.pin} size={12} /> {ev.city}
                        </span>
                      )}
                    </div>
                    <div className="col gap-12" style={{ alignItems: 'flex-end', justifyContent: 'space-between', padding: 16, borderLeft: '0.5px dashed var(--sage-line)' }}>
                      <span style={{ fontWeight: 700, fontSize: 17 }}>€{item.price.toFixed(2)}</span>
                      <Btn variant="ghost" size="sm" onClick={() => removeMut.mutate(item.id)} disabled={removeMut.isPending}>
                        Remove
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="row between" style={{ marginTop: 24, fontSize: 18, fontWeight: 600 }}>
          <span>Total</span>
          <span>€{cart?.total.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
    </div>
  );
}

function ItemCover({ src, label }) {
  if (src) {
    return (
      <div style={{ height: '100%', minHeight: 140, overflow: 'hidden', flexShrink: 0 }}>
        <img src={src} alt={label} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      height: '100%', minHeight: 140, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--sage-light) 0%, var(--paper-deep) 100%)',
      display: 'grid', placeItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--sage-deep)', opacity: 0.4 }}>
        {label?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}
