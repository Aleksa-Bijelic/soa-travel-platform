import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { reservationApi } from '../api/reservationApi';
import { api as tourApi } from '../api/tourApi';
import {
  ACTIVITY_OPTIONS,
  ACTIVITY_CAPACITY_OPTIONS,
} from '../utils/eventCategories';
import { reverseGeocode } from '../utils/geocoding';
import { Btn, ErrBanner } from '../components';

const DEFAULT_CENTER = [45.2671, 19.8335]; // Novi Sad

const CATEGORY_HINTS = {
  concert: 'Live music under the sky — cinema-style seating.',
  theater: 'Theatre play on the open-air stage — cinema-style seating.',
  open_air_cinema: 'Movie night under the sky — cinema-style seating.',
};

function MapClick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

function TourPicker({ tours, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = tours.find((t) => t.id === selectedId);

  const pick = (tour) => {
    onSelect(tour);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 6 }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="input"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          cursor: 'pointer', textAlign: 'left',
        }}>
        {selected ? (
          <>
            <TourThumb tour={selected} size={34} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span className="faint">— Choose a tour —</span>
        )}
        <span style={{
          marginLeft: 'auto', flexShrink: 0, transition: 'transform .15s',
          transform: open ? 'rotate(180deg)' : 'none', color: 'var(--ink-faint)',
        }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, cursor: 'default' }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 41,
            background: 'var(--paper)', border: '1px solid var(--sage-line)', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(60,60,40,.18)', padding: 6,
            maxHeight: 300, overflowY: 'auto',
          }}>
            {tours.map((t) => {
              const keyPoints = [...(t.keyPoints || [])].sort((a, b) => a.order - b.order);
              const activeTour = t.id === selectedId;
              return (
                <button key={t.id} type="button" onClick={() => pick(activeTour ? null : t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: 8, borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${activeTour ? 'var(--sage-deep)' : 'transparent'}`,
                    background: activeTour ? 'var(--paper-deep)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!activeTour) e.currentTarget.style.background = 'var(--paper-deep)'; }}
                  onMouseLeave={(e) => { if (!activeTour) e.currentTarget.style.background = 'transparent'; }}>
                  <TourThumb tour={t} size={46} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </span>
                    <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                      {keyPoints.length} stop{keyPoints.length !== 1 ? 's' : ''}
                      {keyPoints[0] ? ` · from ${keyPoints[0].name}` : ''} · €{t.price}
                    </span>
                  </span>
                  {activeTour && (
                    <span className="badge" style={{ background: 'var(--sage-deep)', color: '#fff', fontSize: 10, flexShrink: 0 }}>
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TourThumb({ tour, size }) {
  const keyPoints = [...(tour.keyPoints || [])].sort((a, b) => a.order - b.order);
  const src = keyPoints[0]?.imageUrl;
  if (src) {
    return (
      <img src={src} alt=""
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--sage-light), var(--paper-deep))',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--serif)', fontSize: size * 0.45, color: 'var(--sage-deep)',
    }}>
      {tour.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

function pinIcon() {
  return L.divIcon({
    html: `<div class="kp-marker" style="background:var(--sage-deep)"><span>+</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export default function CreateEventPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    image_url: '',
    event_type: 'activity',
    event_date: '',
    max_capacity: 80,
    price_per_person: '',
    tour_id: '',
    activity_type: 'concert',
  });
  const [pin, setPin] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const isActivity = form.event_type === 'activity';

  const createMutation = useMutation({
    mutationFn: (data) => reservationApi.createEvent(data, token),
    onSuccess: () => navigate('/events'),
  });

  // Guide's tours for the session dropdown (published only).
  const { data: myTours = [] } = useQuery({
    queryKey: ['my-tours'],
    queryFn: () => tourApi.getMyTours(token),
    enabled: Boolean(token) && !isActivity,
  });
  const publishedTours = (myTours || []).filter((t) => t.status === 'Published');

  // Prefill the session from the picked tour: name/description from the tour,
  // meeting point + map pin + cover from its first key point.
  const handleTourSelect = (tour) => {
    if (!tour) {
      setForm((f) => ({ ...f, tour_id: '', name: '', description: '', location: '', image_url: '' }));
      setPin(null);
      return;
    }
    const keyPoints = [...(tour.keyPoints || [])].sort((a, b) => a.order - b.order);
    const first = keyPoints[0];
    setForm((f) => ({
      ...f,
      tour_id: tour.id,
      name: tour.name || '',
      description: tour.description || '',
      location: first?.name || '',
      image_url: first?.imageUrl || '',
      city: '',
    }));
    if (first) {
      setPin({ lat: first.latitude, lng: first.longitude });
    } else {
      setPin(null);
    }
    setGeoError(null);
  };

  if (user?.role !== 'guide') {
    navigate('/events');
    return null;
  }

  const handlePick = async ({ lat, lng }) => {
    const coords = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };
    setPin(coords);
    setGeoError(null);
    setGeoLoading(true);
    try {
      const { location, city } = await reverseGeocode(coords.lat, coords.lng);
      setForm((f) => ({ ...f, location, city }));
    } catch {
      setGeoError('Could not fetch the address — please type it manually.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const result = await tourApi.uploadTourImage(file, token);
      setForm((f) => ({ ...f, image_url: result.url }));
    } catch (e) {
      setFormError('Image upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (isActivity && !pin) {
      setFormError('Please pick the venue location on the map.');
      return;
    }
    if (!isActivity && !form.tour_id) {
      setFormError('Please choose one of your published tours.');
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      city: form.city,
      image_url: form.image_url,
      event_type: form.event_type,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : '',
      price_per_person: parseFloat(form.price_per_person) || 0,
    };
    if (isActivity) {
      payload.activity_type = form.activity_type;
      payload.max_capacity = form.max_capacity;
      payload.latitude = pin.lat;
      payload.longitude = pin.lng;
    } else {
      payload.tour_id = form.tour_id;
      payload.max_capacity = parseInt(form.max_capacity, 10) || 0;
      if (pin) {
        payload.latitude = pin.lat;
        payload.longitude = pin.lng;
      }
    }
    createMutation.mutate(payload);
  };

  const inputStyle = { marginBottom: 14 };
  const typeBtn = (active) => ({
    flex: 1, padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
    border: `2px solid ${active ? 'var(--sage-deep)' : 'var(--sage-line)'}`,
    background: active ? 'var(--sage-deep)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--ink)',
    fontWeight: 600, fontSize: 14, transition: 'all .15s',
  });
  const submitDisabled = createMutation.isPending || uploading || geoLoading;

  return (
    <div className="container" style={{ padding: '40px 0 80px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 26 }}>
        <span className="eyebrow">Create</span>
        <h1 style={{ marginTop: 6 }}>New Event</h1>
        <p className="muted" style={{ marginTop: 6, maxWidth: 580 }}>
          Create an activity (concert, theatre play, open-air cinema) or schedule
          a tour session for tourists to reserve.
        </p>
      </div>

      <div className="card p-24 fade-up">
        <form onSubmit={handleSubmit}>
          <label className="label">Event Type</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button type="button" style={typeBtn(isActivity)}
              onClick={() => setForm((f) => ({ ...f, event_type: 'activity' }))}>
              Activity
            </button>
            <button type="button" style={typeBtn(!isActivity)}
              onClick={() => setForm((f) => ({ ...f, event_type: 'tour_session' }))}>
              Guided Tour
            </button>
          </div>

          {!isActivity && (
            <div className="card p-16 fade-up" style={{
              background: 'var(--paper-deep)', marginBottom: 16, fontSize: 13, lineHeight: 1.6,
              borderLeft: '4px solid var(--sage-deep)', display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'var(--sage-deep)', color: '#fff',
                display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontWeight: 700,
              }}>i</span>
              <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                <strong style={{ color: 'var(--ink)' }}>Guided Tour</strong> — pick one of your published tours
                below and schedule a date &amp; time. Only travellers who purchased the tour can reserve it.
              </p>
            </div>
          )}

          {isActivity && (
            <>
              <label className="label">Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 6 }}>
                {ACTIVITY_OPTIONS.map((c) => {
                  const active = form.activity_type === c.key;
                  return (
                    <button key={c.key} type="button"
                      onClick={() => setForm((f) => ({ ...f, activity_type: c.key }))}
                      style={{
                        padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${active ? c.badgeBg : 'var(--sage-line)'}`,
                        background: active ? c.badgeBg : 'var(--paper)',
                        color: active ? '#fff' : 'var(--ink)',
                        fontWeight: 600, fontSize: 13, transition: 'all .15s',
                      }}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
                {CATEGORY_HINTS[form.activity_type]}
              </p>
            </>
          )}

          {!isActivity && (
            <>
              <label className="label">Your Published Tour</label>
              {publishedTours.length === 0 ? (
                <div className="empty" style={{ padding: 20, marginBottom: 14 }}>
                  <p style={{ margin: 0 }}>You have no published tours yet. Publish a tour first, then schedule its session here.</p>
                </div>
              ) : (
                <TourPicker tours={publishedTours} selectedId={form.tour_id} onSelect={handleTourSelect} />
              )}
              {form.tour_id && (
                <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
                  Name, description, meeting point and cover are filled from the tour — date, capacity and price are yours to set.
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Name <span className="faint" style={{ fontWeight: 400 }}>(from tour)</span></label>
                  <input className="input" value={form.name} readOnly
                    placeholder="Pick a tour above" style={inputStyle} />
                </div>
                <div>
                  <label className="label">Max Capacity</label>
                  <input className="input" type="number" min={1} value={form.max_capacity}
                    onChange={(e) => setForm((f) => ({ ...f, max_capacity: Number(e.target.value) }))} required style={inputStyle} />
                </div>
              </div>

              <label className="label">Description <span className="faint" style={{ fontWeight: 400 }}>(from tour)</span></label>
              <textarea className="input" value={form.description} readOnly
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Pick a tour above" />

              <label className="label">Meeting point <span className="faint" style={{ fontWeight: 400 }}>(first stop, editable)</span></label>
              <input className="input" value={form.location} onChange={update('location')}
                required placeholder="e.g. Main Square" style={inputStyle} />
              {pin && (
                <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
                  Map pin set from the first stop: {pin.lat.toFixed(5)}°, {pin.lng.toFixed(5)}°
                </p>
              )}
            </>
          )}

          {isActivity && (
            <>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={update('name')} required
                placeholder="e.g. Summer Jazz Night" style={inputStyle} />

              <label className="label">Description</label>
              <textarea className="input" value={form.description} onChange={update('description')}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="What can visitors expect?" />
            </>
          )}

          <label className="label">Cover image <span className="faint" style={{ fontWeight: 400 }}>(optional{!isActivity ? ', defaults to first stop' : ''})</span></label>
          <div style={{ marginBottom: 10 }}>
            <input type="file" accept="image/*" onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
              style={{ display: 'block', width: '100%' }} />
          </div>
          {uploading && <p className="faint" style={{ fontSize: 13, marginBottom: 10 }}>Uploading image…</p>}
          {form.image_url && (
            <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden', height: 180 }}>
              <img src={form.image_url} alt="Event cover preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {isActivity ? (
            <>
              <label className="label">Venue location <span className="faint" style={{ fontWeight: 400 }}>— click the map</span></label>
              <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0', marginBottom: 6 }}>
                <MapContainer center={pin ? [pin.lat, pin.lng] : DEFAULT_CENTER} zoom={13}
                  style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    subdomains="abc"
                    attribution="© OpenStreetMap contributors"
                    maxZoom={19}
                  />
                  <MapClick onPick={handlePick} />
                  {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon()} />}
                </MapContainer>
              </div>
              {geoLoading && <p className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Fetching address…</p>}
              {geoError && <p style={{ fontSize: 12, color: 'var(--terracotta)', marginBottom: 6 }}>{geoError}</p>}
              {pin && (
                <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
                  Pinned at {pin.lat.toFixed(5)}°, {pin.lng.toFixed(5)}° — address filled in below, adjust if needed.
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Address</label>
                  <input className="input" value={form.location} onChange={update('location')}
                    required placeholder="e.g. Main Square 5" style={inputStyle} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={form.city} onChange={update('city')}
                    required placeholder="e.g. Novi Sad" style={inputStyle} />
                </div>
              </div>

              <label className="label">Number of seats</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {ACTIVITY_CAPACITY_OPTIONS.map((o) => {
                  const active = form.max_capacity === o.value;
                  return (
                    <button key={o.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, max_capacity: o.value }))}
                      style={{
                        padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${active ? 'var(--sage-deep)' : 'var(--sage-line)'}`,
                        background: active ? 'var(--sage-deep)' : 'var(--paper)',
                        color: active ? '#fff' : 'var(--ink)',
                        transition: 'all .15s',
                      }}>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{o.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{o.hint}</div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <label className="label">Date & Time</label>
          <input className="input" type="datetime-local" value={form.event_date} onChange={update('event_date')}
            required style={inputStyle} />

          <label className="label">Price per Person (€)</label>
          <input className="input" type="number" step="0.01" min={0} value={form.price_per_person}
            onChange={update('price_per_person')} required style={inputStyle} />

          {(formError || (createMutation.isError && createMutation.error.message)) && (
            <ErrBanner>{formError || createMutation.error.message}</ErrBanner>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => navigate('/events')}>Cancel</Btn>
            <Btn variant="primary" type="submit" disabled={submitDisabled}>
              {createMutation.isPending ? 'Creating…' : 'Create Event'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
