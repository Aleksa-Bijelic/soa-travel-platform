import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

export default function MyReservationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationApi.getMyReservations(token),
  });

  const reservations = data || [];

  const cancelMutation = useMutation({
    mutationFn: (id) => reservationApi.cancelReservation(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-reservations']);
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
  });

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;

  return (
    <div className="container" style={{ padding: '40px 0 80px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 26 }}>
        <span className="eyebrow">My Bookings</span>
        <h1 style={{ marginTop: 6 }}>My Reservations</h1>
        <p className="muted" style={{ marginTop: 6, maxWidth: 580 }}>
          View your event reservations. Pending reservations must be paid through the cart.
        </p>
      </div>

      {error && <ErrBanner>{error.message}</ErrBanner>}

      {!isLoading && reservations.length === 0 && (
        <div className="card p-32" style={{ textAlign: 'center' }}>
          <Icon d={ICONS.cart} size={32} style={{ color: 'var(--ink-faint)' }} />
          <p className="muted" style={{ marginTop: 12 }}>No reservations yet</p>
          <Btn variant="primary" onClick={() => navigate('/events')} style={{ marginTop: 16 }}>
            Browse Events
          </Btn>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {reservations.map((res) => {
          const isPending = res.status === 'pending';
          const isConfirmed = res.status === 'confirmed';
          const isCancelled = res.status === 'cancelled';

          return (
            <div key={res.id} className="card p-20 fade-up" style={{
              borderLeft: isPending ? '4px solid var(--gold)' : isConfirmed ? '4px solid var(--sage-deep)' : '4px solid var(--ink-faint)',
              opacity: isCancelled ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{res.event_name}</h3>
                    <span className="badge" style={{
                      background: isConfirmed ? 'var(--sage-deep)' : isPending ? 'var(--gold)' : 'var(--ink-faint)',
                      color: '#fff', fontSize: 11,
                    }}>
                      {isConfirmed ? 'Confirmed' : isPending ? 'Pending Payment' : res.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, flexWrap: 'wrap' }}>
                    {res.seat_number && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Seat #{res.seat_number}</span>
                    )}
                    {res.event_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon d={ICONS.clock} size={12} /> {formatDate(res.event_date)}
                      </span>
                    )}
                    {res.price_per_person > 0 && (
                      <span style={{ fontWeight: 700 }}>{res.price_per_person.toFixed(2)} €</span>
                    )}
                  </div>
                  <span className="faint" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Reserved: {formatDate(res.reserved_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {isPending && (
                    <Btn variant="primary" size="sm" onClick={() => navigate('/cart')}>
                      Go to Cart
                    </Btn>
                  )}
                  {(isPending || isConfirmed) && (
                    <Btn variant="ghost" size="sm" icon="close"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Cancel this reservation? Your seat will be released.')) {
                          cancelMutation.mutate(res.id);
                        }
                      }}>Cancel</Btn>
                  )}
                </div>
              </div>

              {isPending && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: '#fff9e6', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                }}>
                  This reservation is pending payment. Go to <strong>Cart</strong> and complete checkout to confirm your seat.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
