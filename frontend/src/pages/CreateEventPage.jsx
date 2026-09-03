import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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
  const submitDisabled = createMutation.isPending || uploading || (isActivity && geoLoading);
  const mutationError = createMutation.isError ? createMutation.error.message : null;

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
              Tour Session
            </button>
          </div>

          {!isActivity && (
            <div className="card p-12" style={{ background: 'var(--paper-deep)', marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
              <strong>Tour Session</strong> — You are scheduling a specific date/time for one of your published tours.
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

          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={update('name')} required
            placeholder={isActivity ? 'e.g. Summer Jazz Night' : 'e.g. Morning City Walk — Dec 15'}
            style={inputStyle} />

          <label className="label">Description</label>
          <textarea className="input" value={form.description} onChange={update('description')}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="What can visitors expect?" />

          <label className="label">Cover image <span className="faint" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input type="file" accept="image/*" onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 10 }} />
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
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.location} onChange={update('location')} required style={inputStyle} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={form.city} onChange={update('city')}
                    placeholder="e.g. Novi Sad" style={inputStyle} />
                </div>
              </div>
              <label className="label">Tour ID</label>
              <input className="input" value={form.tour_id} onChange={update('tour_id')}
                placeholder="UUID of your published tour from tour-service" required style={inputStyle} />
            </>
          )}

          <label className="label">Date & Time</label>
          <input className="input" type="datetime-local" value={form.event_date} onChange={update('event_date')}
            required style={inputStyle} />

          <div style={{ display: 'grid', gridTemplateColumns: isActivity ? '1fr' : '1fr 1fr', gap: 12 }}>
            {!isActivity && (
              <div>
                <label className="label">Max Capacity</label>
                <input className="input" type="number" min={1} value={form.max_capacity}
                  onChange={(e) => setForm((f) => ({ ...f, max_capacity: Number(e.target.value) }))} required style={inputStyle} />
              </div>
            )}
            <div>
              <label className="label">Price per Person (€)</label>
              <input className="input" type="number" step="0.01" min={0} value={form.price_per_person}
                onChange={update('price_per_person')} required style={inputStyle} />
            </div>
          </div>

          {(formError || mutationError) && <ErrBanner>{formError || mutationError}</ErrBanner>}

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
