import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import { categoryLabel, eventCover } from '../utils/eventCategories';
import { Btn, Icon, ICONS, ErrBanner } from '../components';

function venueIcon() {
  return L.divIcon({
    html: `<div class="kp-marker kp-marker-first"><span>★</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => reservationApi.getEvent(id, token),
  });

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const formatShortDate = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  if (eventLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (eventError) return <div className="container" style={{ padding: 40 }}><ErrBanner>{eventError.message}</ErrBanner></div>;
  if (!event) return null;

  const hasCoords = event.latitude != null && event.longitude != null;
  const isTour = event.event_type === 'tour_session';
  const soldOut = event.status === 'full' || event.available_spots <= 0;
  const takenCount = event.max_capacity - event.available_spots;
  const takenRatio = event.max_capacity > 0 ? Math.min(1, takenCount / event.max_capacity) : 0;

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')} style={{ marginBottom: 16 }}>
        <Icon d={ICONS.chevL} size={14} /> Back to events
      </button>

      {/* Header — like the tour detail page */}
      <div className="card fade-up" style={{ marginBottom: 20, overflow: 'hidden' }}>
        {eventCover(event) && (
          <div style={{ height: 240, overflow: 'hidden' }}>
            <img src={eventCover(event)} alt={event.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div className="p-24">
          <div className="row gap-8 wrap" style={{ marginBottom: 8 }}>
            <span className="badge" style={{
              background: isTour ? 'var(--sage-deep)' : 'var(--gold)',
              color: '#fff', fontSize: 11,
            }}>{categoryLabel(event)}</span>
            <span className="badge" style={{
              background: event.status === 'full' ? 'var(--terracotta)' : 'var(--sage-deep)',
              color: '#fff', fontSize: 11,
            }}>{event.status}</span>
          </div>
          <h1 style={{ marginTop: 4, fontSize: 36 }}>{event.name}</h1>
          <p className="muted" style={{ maxWidth: 700, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
            {event.description}
          </p>
          <div className="row gap-24 wrap" style={{ marginTop: 18 }}>
            <div className="stat">
              <span className="v">{formatShortDate(event.event_date)}</span>
              <span className="l">Date</span>
            </div>
            <div className="stat">
              <span className="v" style={{ fontSize: 22 }}>{event.city || event.location || '—'}</span>
              <span className="l">{event.city ? 'City' : 'Meeting point'}</span>
            </div>
            <div className="stat">
              <span className="v" style={{ fontFamily: 'var(--serif)' }}>€{event.price_per_person?.toFixed(2)}</span>
              <span className="l">Price</span>
            </div>
            <div className="stat">
              <span className="v">
                {event.available_spots}
                <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}> / {event.max_capacity}</span>
              </span>
              <span className="l">Seats left</span>
            </div>
          </div>
          <div className="row gap-12" style={{ marginTop: 18, alignItems: 'center' }}>
            {user?.role === 'tourist' && !soldOut && (
              <Btn variant="primary" icon="cart"
                onClick={() => navigate(isTour ? `/events/${event.id}/book` : `/events/${event.id}/seats`)}>
                {isTour ? 'Reserve Spots' : 'Choose Seats'}
              </Btn>
            )}
            {user?.role === 'tourist' && soldOut && (
              <span className="badge" style={{ background: 'var(--terracotta)', color: '#fff' }}>Fully booked</span>
            )}
            {user?.role === 'guide' && (
              <span className="faint" style={{ fontSize: 13 }}>Guides can view event details but cannot make reservations.</span>
            )}
            {!soldOut && (
              <span className="faint" style={{ fontSize: 13 }}>
                {isTour
                  ? 'Spots stay locked for 5 minutes after reserving — complete checkout to confirm.'
                  : 'Seats stay locked for 5 minutes after reserving — complete checkout to confirm.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map + details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card fade-up" style={{ padding: 16 }}>
          <span className="eyebrow">The venue</span>
          <h3 style={{ marginTop: 4, marginBottom: 12 }}>Map &amp; location</h3>
          {hasCoords ? (
            <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0' }}>
              <MapContainer center={[event.latitude, event.longitude]} zoom={15}
                style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  subdomains="abc"
                  attribution="© OpenStreetMap contributors"
                  maxZoom={19}
                />
                <Marker position={[event.latitude, event.longitude]} icon={venueIcon()} />
              </MapContainer>
            </div>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <p style={{ margin: 0 }}>No map location provided for this event.</p>
            </div>
          )}
        </div>

        <div className="card fade-up p-20">
          <span className="eyebrow">Good to know</span>
          <h3 style={{ marginTop: 4, marginBottom: 4 }}>Event details</h3>
          <DetailRow icon={ICONS.tag || ICONS.pin} label="Category" value={categoryLabel(event)} />
          <DetailRow icon={ICONS.clock} label="Date & time" value={formatDate(event.event_date)} />
          <DetailRow icon={ICONS.pin} label="Location" value={event.city ? `${event.location}, ${event.city}` : event.location} />
          <DetailRow icon={ICONS.cart} label="Price" value={`${event.price_per_person?.toFixed(2)} € per seat`} />
          <div style={{ padding: '12px 0', borderTop: '0.5px dashed var(--sage-line)' }}>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="faint" style={{ fontSize: 12 }}>Availability</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{takenCount} / {event.max_capacity} taken</span>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: 'var(--paper-deep)', marginTop: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.round(takenRatio * 100)}%`, height: '100%',
                background: soldOut ? 'var(--terracotta)' : 'var(--sage-deep)',
                borderRadius: 5, transition: 'width .3s',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '12px 0',
      borderTop: '0.5px dashed var(--sage-line)',
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--paper-deep)', color: 'var(--sage-deep)',
        display: 'grid', placeItems: 'center', marginTop: 2,
      }}>
        <Icon d={icon} size={14} />
      </span>
      <div>
        <div className="faint" style={{ fontSize: 11 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, lineHeight: 1.5 }}>{value || '—'}</div>
      </div>
    </div>
  );
}
