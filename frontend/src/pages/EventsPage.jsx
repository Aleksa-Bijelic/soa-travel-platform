import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import {
  EVENT_CATEGORIES,
  categoryLabel,
  eventCover,
  formatEventDate,
} from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function EventsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [categoryKey, setCategoryKey] = useState('all');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [layout, setLayout] = useState('grid');

  const search = useDebounced(q.trim());
  const meta = EVENT_CATEGORIES.find((c) => c.key === categoryKey) || EVENT_CATEGORIES[0];

  const filters = useMemo(() => {
    const f = {};
    if (meta.apiType) f.type = meta.apiType;
    if (meta.apiCategory) f.category = meta.apiCategory;
    if (city) f.city = city;
    if (search) f.search = search;
    return f;
  }, [meta, city, search]);

  // Backend already filters event_date > NOW(), but drop anything that
  // slipped through or expired while cached so past events never render.
  const dropPastEvents = (list) => {
    const now = Date.now();
    return (list || []).filter((ev) => new Date(ev.event_date).getTime() > now);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', categoryKey, city, search],
    queryFn: async () => dropPastEvents(await reservationApi.getEvents(token, filters)),
  });

  // City options come from the unfiltered list so the dropdown stays complete.
  const { data: allEvents } = useQuery({
    queryKey: ['events-cities'],
    queryFn: async () => dropPastEvents(await reservationApi.getEvents(token, {})),
    staleTime: 60_000,
  });

  const events = data || [];
  const cities = useMemo(() => {
    const set = new Set();
    (allEvents || []).forEach((ev) => {
      if (ev.city) set.add(ev.city);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allEvents]);

  return (
    <div style={{
      background: `linear-gradient(to right, rgba(245,240,232,0) 0%, rgb(245,240,232) 18%, rgb(245,240,232) 82%, rgba(245,240,232,0) 100%), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=3840&q=100&fm=webp') center/cover no-repeat fixed`,
    }}>
    <div className="container" style={{ padding: '40px 0 80px' }}>
      <div style={{ marginBottom: 26 }}>
        <span className="eyebrow">Discover</span>
        <h1 style={{ marginTop: 6 }}>Events worth attending</h1>
        <p className="muted" style={{ marginTop: 6, maxWidth: 580 }}>
          {user?.role === 'guide'
            ? 'Create and manage guided tours, concerts, theatre plays and open-air cinema nights.'
            : 'Guided tours, concerts, theatre plays and open-air cinema. Reserve your seat before it fills up.'}
        </p>
      </div>

      <div className="card p-16 fade-up" style={{ marginBottom: 22 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          gap: 12, alignItems: 'center',
        }}>
          <div style={{ position: 'relative' }}>
            <Icon d={ICONS.search} size={16} style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--ink-faint)',
            }} />
            <input className="input" placeholder="Search by name, place or city…" value={q}
              onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}
            style={{ minWidth: 160 }}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="row gap-4">
            <button onClick={() => setLayout('grid')}
              className={`btn ${layout === 'grid' ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
              <Icon d="M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z" size={14} />
            </button>
            <button onClick={() => setLayout('list')}
              className={`btn ${layout === 'list' ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
              <Icon d="M3 6h18M3 12h18M3 18h18" size={14} />
            </button>
          </div>
        </div>
        <div className="row gap-4 wrap" style={{ marginTop: 12 }}>
          {EVENT_CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategoryKey(c.key)}
              className={`btn ${categoryKey === c.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
              {c.label}
            </button>
          ))}
          <span className="faint" style={{ fontSize: 13, marginLeft: 'auto' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {user?.role === 'guide' && (
        <Btn variant="primary" icon="plus" onClick={() => navigate('/events/create')} style={{ marginBottom: 22 }}>
          Create Event
        </Btn>
      )}

      {isLoading && <div style={{ padding: 40 }}>Loading…</div>}
      {error && <ErrBanner>{error.message}</ErrBanner>}

      {!isLoading && !error && events.length === 0 && (
        <div className="empty">
          <Icon d={ICONS.compass} size={32} style={{ color: 'var(--ink-faint)' }} />
          <h3 style={{ marginTop: 12 }}>No matches</h3>
          <p>{user?.role === 'guide' ? 'No events here yet. Click "Create Event" to get started.' : 'Try a different keyword, city or category.'}</p>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (layout === 'list' ? (
        <div className="col gap-16">
          {events.map((ev, i) => <EventRow key={ev.id} ev={ev} idx={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {events.map((ev, i) => <EventCard key={ev.id} ev={ev} idx={i} />)}
        </div>
      ))}
    </div>
    </div>
  );
}

function EventCover({ ev, height = 170 }) {
  const src = eventCover(ev);
  if (src) {
    return (
      <div style={{ height, overflow: 'hidden', flexShrink: 0 }}>
        <img src={src} alt={ev.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy" />
      </div>
    );
  }
  return (
    <div style={{
      height, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--sage-light) 0%, var(--paper-deep) 100%)',
      display: 'grid', placeItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--sage-deep)', opacity: 0.4 }}>
        {ev.name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

function CategoryBadge({ ev }) {
  const isTour = ev.event_type === 'tour_session';
  const bg = isTour
    ? 'var(--sage-deep)'
    : (EVENT_CATEGORIES.find((c) => c.key === ev.activity_type)?.badgeBg || 'var(--gold)');
  return (
    <span className="badge" style={{ background: bg, color: '#fff', fontSize: 11 }}>
      {categoryLabel(ev)}
    </span>
  );
}

function EventCard({ ev, idx }) {
  const navigate = useNavigate();
  const soldOut = ev.status === 'full' || ev.available_spots <= 0;
  return (
    <div className="card fade-up" style={{
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      animationDelay: `${idx * 50}ms`,
    }}>
      <EventCover ev={ev} height={170} />
      <div className="col gap-8 p-20" style={{ flex: 1 }}>
        <div className="row gap-8 wrap" style={{ alignItems: 'center' }}>
          <CategoryBadge ev={ev} />
          {soldOut && (
            <span className="badge" style={{ background: 'var(--terracotta)', color: '#fff', fontSize: 11 }}>
              Full
            </span>
          )}
          <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--sage-darker)', marginLeft: 'auto', fontWeight: 700 }}>
            €{ev.price_per_person?.toFixed(2)}
          </span>
        </div>
        <h3 style={{ marginTop: 2 }}>{ev.name}</h3>
        <p className="muted" style={{
          fontSize: 13.5, lineHeight: 1.55, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {ev.description || 'No description available.'}
        </p>
        <div className="row" style={{
          marginTop: 4, padding: '10px 12px',
          background: 'var(--paper-deep)', borderRadius: 'var(--radius)', gap: 14, flexWrap: 'wrap',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Icon d={ICONS.pin} size={13} /> {ev.location}{ev.city ? `, ${ev.city}` : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Icon d={ICONS.clock} size={13} /> {formatEventDate(ev.event_date)}
          </span>
        </div>
        <hr className="hr-dashed" style={{ margin: '10px 0' }} />
        <div className="row between" style={{ alignItems: 'center', marginTop: 'auto' }}>
          <span className="faint" style={{ fontSize: 13 }}>
            {ev.available_spots} / {ev.max_capacity} spots
          </span>
          <Btn variant="primary" size="sm" iconRight="arrow" onClick={() => navigate(`/events/${ev.id}`)}>View</Btn>
        </div>
      </div>
    </div>
  );
}

function EventRow({ ev, idx }) {
  const navigate = useNavigate();
  const soldOut = ev.status === 'full' || ev.available_spots <= 0;
  return (
    <div className="card fade-up" style={{
      display: 'grid', gridTemplateColumns: '200px 1fr 200px',
      gap: 0, overflow: 'hidden', animationDelay: `${idx * 40}ms`,
    }}>
      <EventCover ev={ev} height="100%" />
      <div className="col gap-8" style={{ minWidth: 0, padding: 18 }}>
        <div className="row gap-8 wrap">
          <CategoryBadge ev={ev} />
          {soldOut && (
            <span className="badge" style={{ background: 'var(--terracotta)', color: '#fff', fontSize: 11 }}>
              Full
            </span>
          )}
        </div>
        <h3>{ev.name}</h3>
        <p className="muted" style={{
          fontSize: 14, lineHeight: 1.55, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {ev.description || 'No description available.'}
        </p>
        <div className="faint" style={{ fontSize: 13 }}>
          {ev.location}{ev.city ? `, ${ev.city}` : ''} · {formatEventDate(ev.event_date)}
        </div>
      </div>
      <div className="col gap-12" style={{ alignItems: 'stretch', justifyContent: 'space-between', padding: 18, borderLeft: '0.5px dashed var(--sage-line)' }}>
        <div style={{ background: 'var(--paper-deep)', borderRadius: 'var(--radius)', padding: 12 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Available</div>
          <div style={{ fontFamily: 'var(--serif)', color: 'var(--sage-darker)', fontSize: 15, marginTop: 4 }}>
            {ev.available_spots} / {ev.max_capacity}
          </div>
        </div>
        <span className="price-badge" style={{ textAlign: 'center', justifyContent: 'center', fontSize: 16 }}>
          €{ev.price_per_person?.toFixed(2)}
        </span>
        <Btn variant="primary" iconRight="arrow" onClick={() => navigate(`/events/${ev.id}`)}>View</Btn>
      </div>
    </div>
  );
}
