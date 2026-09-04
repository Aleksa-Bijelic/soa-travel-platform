import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/tourApi';
import { reservationApi } from '../api/reservationApi';
import { useAuth } from '../context/AuthContext';
import { categoryLabel, eventCover, formatEventDate } from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

const RES_STATUS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_BG = {
  pending: 'var(--gold)',
  confirmed: 'var(--sage-deep)',
  cancelled: 'var(--ink-faint)',
};

export default function PurchasedToursPage({ initialTab = 'tours' }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(initialTab);

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.getPurchases(token),
    enabled: Boolean(token),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: reservationsData, error: resError } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationApi.getMyReservations(token),
    enabled: Boolean(token),
  });
  const reservations = reservationsData || [];

  const tabBtn = (active) => ({
    flex: 1, padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
    border: `2px solid ${active ? 'var(--sage-deep)' : 'var(--sage-line)'}`,
    background: active ? 'var(--sage-deep)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--ink)',
    fontWeight: 600, fontSize: 14, transition: 'all .15s',
  });

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <div style={{ marginBottom: 22 }}>
        <span className="eyebrow">My Purchases</span>
        <h1 style={{ marginTop: 6 }}>Tours &amp; Reservations</h1>
        <p className="muted" style={{ marginTop: 6, maxWidth: 620 }}>
          Everything you bought or booked — purchased tours and event reservations with their payment status.
        </p>
      </div>

      {resError && <div style={{ marginBottom: 14 }}><ErrBanner>{resError.message}</ErrBanner></div>}

      <div className="card p-16 fade-up" style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" style={tabBtn(tab === 'tours')} onClick={() => setTab('tours')}>
            Tours ({purchases.length})
          </button>
          <button type="button" style={tabBtn(tab === 'reservations')} onClick={() => setTab('reservations')}>
            Reservations ({reservations.length})
          </button>
        </div>
      </div>

      {tab === 'tours'
        ? <ToursTab purchases={purchases} token={token} navigate={navigate} queryClient={queryClient} />
        : <ReservationsTab reservations={reservations} token={token} navigate={navigate} queryClient={queryClient} />}
    </div>
  );
}

/* ─── Tours tab ─────────────────────────────────────────────── */

function ToursTab({ purchases, token, navigate }) {
  const [q, setQ] = useState('');

  // Published tours carry the cover image (first key point).
  const { data: published = [] } = useQuery({
    queryKey: ['published-tours'],
    queryFn: () => api.getPublishedTours(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const covers = useMemo(() => {
    const map = {};
    (published || []).forEach((t) => {
      if (t?.firstKeyPoint?.imageUrl) map[t.id] = t.firstKeyPoint.imageUrl;
    });
    return map;
  }, [published]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return purchases;
    return purchases.filter((p) =>
      p.tour_name?.toLowerCase().includes(s) ||
      p.tour_description?.toLowerCase().includes(s),
    );
  }, [purchases, q]);

  return (
    <>
      <div className="card p-16 fade-up" style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: 12, alignItems: 'center', marginBottom: 20,
      }}>
        <div style={{ position: 'relative' }}>
          <Icon d={ICONS.search} size={16} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--ink-faint)',
          }} />
          <input className="input" placeholder="Search your tours…" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <span className="faint" style={{ fontSize: 13 }}>
          {filtered.length} tour{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {purchases.length === 0 ? (
        <div className="empty" style={{ padding: 26 }}>
          <h3>You haven't purchased any tours yet.</h3>
          <p>Browse available tours and checkout to unlock them.</p>
          <Btn variant="primary" onClick={() => navigate('/browse')} style={{ marginTop: 12 }}>
            Browse Tours
          </Btn>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ padding: 26 }}>
          <h3>No matches</h3>
          <p>Try a different keyword.</p>
        </div>
      ) : (
        <div className="col gap-16">
          {filtered.map((p, i) => (
            <div key={p.id} className="card fade-up" style={{
              display: 'grid', gridTemplateColumns: '200px 1fr 190px',
              gap: 0, overflow: 'hidden', animationDelay: `${i * 40}ms`,
            }}>
              <TourCover src={covers[p.tour_id]} label={p.tour_name} />
              <div className="col gap-8" style={{ minWidth: 0, padding: 18 }}>
                <span className="badge" style={{ background: 'var(--sage-deep)', color: '#fff', fontSize: 11, alignSelf: 'flex-start' }}>
                  Purchased
                </span>
                <h3 style={{ margin: 0 }}>{p.tour_name}</h3>
                <p className="muted" style={{
                  fontSize: 13.5, lineHeight: 1.55, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {p.tour_description || 'No description available.'}
                </p>
                <span className="faint" style={{ fontSize: 12 }}>
                  Bought {formatEventDate(p.created_at)}
                </span>
              </div>
              <div className="col gap-12" style={{ alignItems: 'stretch', justifyContent: 'space-between', padding: 18, borderLeft: '0.5px dashed var(--sage-line)' }}>
                <span className="price-badge" style={{ textAlign: 'center', justifyContent: 'center', fontSize: 16 }}>
                  €{p.price?.toFixed(2)}
                </span>
                <Btn variant="primary" size="sm" iconRight="arrow" onClick={() => navigate(`/browse/${p.tour_id}`)}>
                  View tour
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TourCover({ src, label }) {
  if (src) {
    return (
      <div style={{ height: '100%', minHeight: 150, overflow: 'hidden', flexShrink: 0 }}>
        <img src={src} alt={label} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      height: '100%', minHeight: 150, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--sage-light) 0%, var(--paper-deep) 100%)',
      display: 'grid', placeItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--sage-deep)', opacity: 0.4 }}>
        {label?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

/* ─── Reservations tab ──────────────────────────────────────── */

function ReservationsTab({ reservations, token, navigate, queryClient }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  // Full event list carries cover, category and location info.
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => reservationApi.getEvents(token, {}),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const eventInfo = useMemo(() => {
    const map = {};
    (events || []).forEach((ev) => { map[ev.id] = ev; });
    return map;
  }, [events]);

  const cancelMutation = useMutation({
    mutationFn: (id) => reservationApi.cancelReservation(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return reservations.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (s && !r.event_name?.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [reservations, q, status]);

  return (
    <>
      <div className="card p-16 fade-up" style={{ marginBottom: 20 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: 12, alignItems: 'center',
        }}>
          <div style={{ position: 'relative' }}>
            <Icon d={ICONS.search} size={16} style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--ink-faint)',
            }} />
            <input className="input" placeholder="Search your reservations…" value={q}
              onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <span className="faint" style={{ fontSize: 13 }}>
            {filtered.length} reservation{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="row gap-4 wrap" style={{ marginTop: 12 }}>
          {RES_STATUS.map((s) => (
            <button key={s.key} onClick={() => setStatus(s.key)}
              className={`btn ${status === s.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
              {s.label}
            </button>
          ))}
          <span className="faint" style={{ fontSize: 12, marginLeft: 'auto' }}>
            Pending reservations must be paid through the cart.
          </span>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="card p-32" style={{ textAlign: 'center' }}>
          <Icon d={ICONS.cart} size={32} style={{ color: 'var(--ink-faint)' }} />
          <p className="muted" style={{ marginTop: 12 }}>No reservations yet</p>
          <Btn variant="primary" onClick={() => navigate('/events')} style={{ marginTop: 16 }}>
            Browse Events
          </Btn>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ padding: 26 }}>
          <h3>No matches</h3>
          <p>Try a different keyword or status filter.</p>
        </div>
      ) : (
        <div className="col gap-16">
          {filtered.map((res, i) => {
            const ev = eventInfo[res.event_id];
            const isPending = res.status === 'pending';
            const isConfirmed = res.status === 'confirmed';
            const isCancelled = res.status === 'cancelled';
            return (
              <div key={res.id} className="card fade-up" style={{
                display: 'grid', gridTemplateColumns: '170px 1fr auto',
                gap: 0, overflow: 'hidden', animationDelay: `${i * 40}ms`,
                opacity: isCancelled ? 0.65 : 1,
              }}>
                <ReservationCover ev={ev} name={res.event_name} />
                <div className="col gap-8" style={{ minWidth: 0, padding: 16 }}>
                  <div className="row gap-8 wrap" style={{ alignItems: 'center' }}>
                    <span className="badge" style={{
                      background: ev?.event_type === 'tour_session' ? 'var(--sage-deep)' : 'var(--gold)',
                      color: '#fff', fontSize: 11,
                    }}>
                      {ev ? categoryLabel(ev) : 'Event'}
                    </span>
                    <span className="badge" style={{ background: STATUS_BG[res.status] || 'var(--ink-faint)', color: '#fff', fontSize: 11 }}>
                      {isPending ? 'Pending Payment' : isConfirmed ? 'Confirmed' : res.status}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{res.event_name}</h3>
                  <div className="row gap-16 wrap" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {res.seat_number != null && (
                      <span>Seat #{res.seat_number}</span>
                    )}
                    {res.event_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon d={ICONS.clock} size={12} /> {formatEventDate(res.event_date)}
                      </span>
                    )}
                    {ev?.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon d={ICONS.pin} size={12} /> {ev.city}
                      </span>
                    )}
                    {res.price_per_person > 0 && (
                      <span style={{ fontWeight: 700 }}>{res.price_per_person.toFixed(2)} €</span>
                    )}
                  </div>
                  <span className="faint" style={{ fontSize: 12 }}>
                    Reserved: {formatEventDate(res.reserved_at)}
                  </span>
                  {isPending && (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Complete checkout in the cart to confirm — expires 5 min after reserving.
                    </span>
                  )}
                </div>
                <div className="col gap-8" style={{ alignItems: 'flex-end', justifyContent: 'center', padding: 16, borderLeft: '0.5px dashed var(--sage-line)' }}>
                  <Btn variant="ghost" size="sm" iconRight="arrow" onClick={() => navigate(`/events/${res.event_id}`)}>
                    View event
                  </Btn>
                  {isPending && (
                    <Btn variant="primary" size="sm" onClick={() => navigate('/cart')}>
                      Go to Cart
                    </Btn>
                  )}
                  {(isPending || isConfirmed) && (
                    <Btn variant="ghost" size="sm" icon="close"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Cancel this reservation? Your spot will be released.')) {
                          cancelMutation.mutate(res.id);
                        }
                      }}>Cancel</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ReservationCover({ ev, name }) {
  const src = ev ? eventCover(ev) : null;
  if (src) {
    return (
      <div style={{ height: '100%', minHeight: 150, overflow: 'hidden', flexShrink: 0 }}>
        <img src={src} alt={name} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      height: '100%', minHeight: 150, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--sage-light) 0%, var(--paper-deep) 100%)',
      display: 'grid', placeItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--sage-deep)', opacity: 0.4 }}>
        {name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}
