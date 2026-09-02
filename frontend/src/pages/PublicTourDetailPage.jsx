import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { api } from '../api/tourApi';
import { api as stakeholdersApi } from '../api/stakeholdersApi';
import { useAuth } from '../context/AuthContext';
import { Btn, Difficulty, Tag, TransportPill, ErrBanner, Icon, ICONS, ProfileUsername } from '../components';
import { formatDate } from '../utils/helpers';

import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

function makeKpIcon(index, isFirst) {
  return L.divIcon({
    html: `<div class="kp-marker ${isFirst ? 'kp-marker-first' : ''}"><span>${index + 1}</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function RouteLayer({ keyPoints }) {
  const map = useMap();

  useEffect(() => {
    if (keyPoints.length < 2) return;

    const waypoints = keyPoints.map((kp) =>
      L.latLng(kp.latitude, kp.longitude)
    );

    const control = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      lineOptions: { styles: [{ color: '#5a7a5a', weight: 3, opacity: 0.7 }], },
      createMarker: () => null,
    });

    const orig = control._clearLines.bind(control);
    control._clearLines = function () {
      if (this._map) orig();
    };

    control.addTo(map);

    return () => {
      try { control.getPlan().setWaypoints([]); } catch (_) {}
      try { map.removeControl(control); } catch (_) {}
    };

    return () => { map.removeControl(control) };
  }, [keyPoints.map((k) => `${k.id}-${k.latitude}-${k.longitude}`).join(',')]);

  return null;
}

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: readonly ? 'default' : 'pointer',
            color: (hovered ?? value) >= star ? 'var(--gold)' : 'var(--sage-line)',
            transition: 'color .12s ease',
          }}
        >
          <Icon d={ICONS.star} size={20} stroke={1.2} fill={(hovered ?? value) >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div style={{
      padding: '16px 0',
      borderTop: '0.5px dashed var(--sage-line)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--sage)', color: 'var(--paper)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, flexShrink: 0,
          }}>
            {review.touristUsername?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <ProfileUsername fontSize={14} username={review.touristUsername}/>
            <div className="faint" style={{ fontSize: 12 }}>Visited {formatDate(review.visitedAt)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <StarRating value={review.rating} readonly />
          <span className="faint" style={{ fontSize: 11 }}>{formatDate(review.createdAt)}</span>
        </div>
      </div>

      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{review.comment}</p>

      {review.imageUrls?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {review.imageUrls.map((img, i) => (
            <img key={i} src={img} alt={`Review image ${i + 1}`}
              style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--sage-line)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewSection({ tourId, token, isPurchased }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isTourist = user?.role === 'tourist';

  const [form, setForm] = useState({ rating: 0, comment: '', visitedAt: '', images: [] });
  const [formErr, setFormErr] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', tourId],
    queryFn: () => api.getReviews(tourId, token),
    enabled: Boolean(tourId && token),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const imageUrls = await Promise.all(
        form.images.map((file) => api.uploadTourImage(file, token))
      );
      return api.createReview(tourId, {
        rating: form.rating,
        comment: form.comment,
        visitedAt: new Date(form.visitedAt).toISOString(),
        imageUrls: imageUrls.map(r => r.url).filter(Boolean),
      }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', tourId] });
      setForm({ rating: 0, comment: '', visitedAt: '', images: [] });
      setShowForm(false);
      setFormErr(null);
    },
    onError: (e) => setFormErr(e.message),
  });

  const handleSubmit = () => {
    if (form.rating === 0) { setFormErr('Please select a rating.'); return; }
    if (!form.comment.trim()) { setFormErr('Please write a comment.'); return; }
    if (!form.visitedAt) { setFormErr('Please select when you visited.'); return; }
    setFormErr(null);
    createMut.mutate();
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="card fade-up p-20" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <span className="eyebrow">Community</span>
          <h3 style={{ marginTop: 4 }}>Reviews</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {avgRating && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--sage-darker)', lineHeight: 1 }}>{avgRating}</div>
              <div className="faint" style={{ fontSize: 11 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {isTourist && isPurchased && !showForm && (
            <Btn variant="primary" size="sm" icon="plus" onClick={() => setShowForm(true)}>
              Write a review
            </Btn>
          )}
        </div>
      </div>

      {isTourist && isPurchased && showForm && (
        <div style={{
          background: 'var(--paper-deep)', borderRadius: 'var(--radius)',
          padding: 16, marginBottom: 20, border: '0.5px solid var(--sage-line)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ margin: 0 }}>Your review</h4>
            <button className="btn-icon" onClick={() => { setShowForm(false); setFormErr(null); }}>
              <Icon d={ICONS.close} size={14} />
            </button>
          </div>

          <div className="col gap-12">
            <div className="field">
              <label className="field-label">Rating</label>
              <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
            </div>

            <div className="field">
              <label className="field-label">Comment</label>
              <textarea className="textarea" rows={3} placeholder="Share your experience…"
                value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>

            <div className="field">
              <label className="field-label">Date visited</label>
              <input className="input" type="date" value={form.visitedAt}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, visitedAt: e.target.value })} />
            </div>

            <div className="field">
               <label className="field-label">Photos (optional)</label>
               <input type="file" accept="image/*" multiple style={{ fontSize: 13, color: 'var(--ink-soft)' }} onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setForm({ ...form, images: files });
                }} />
                {form.images.length > 0 && (
                   <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                     {form.images.map((file, i) => (<div key={i} style={{ position: 'relative' }}>
                        <img src={URL.createObjectURL(file)} alt={`Preview ${i + 1}`} style={{
                              width: 80, height: 80, objectFit: 'cover',
                              borderRadius: 8, border: '0.5px solid var(--sage-line)',
                            }}
                        />
                        <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                          style={{
                             position: 'absolute', top: -6, right: -6,
                             width: 20, height: 20, borderRadius: '50%',
                             border: 'none', background: 'var(--terracotta)',
                             color: 'var(--paper)', fontSize: 12,
                             cursor: 'pointer', display: 'grid', placeItems: 'center',
                           }}
                        >×</button>
                      </div>
                      ))}
                   </div>
                 )}
             </div>

            {formErr && <ErrBanner onClose={() => setFormErr(null)}>{formErr}</ErrBanner>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormErr(null); }}>Cancel</Btn>
              <Btn variant="primary" size="sm" onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Submitting…' : 'Submit review'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="muted" style={{ fontSize: 13.5 }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="empty" style={{ padding: 22, marginTop: 8 }}>
          <p style={{ margin: 0 }}>No reviews yet. {isTourist && isPurchased ? 'Be the first to share your experience!' : ''}</p>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}

function StartTourButton({ tourId, token, navigate }) {
  const startMut = useMutation({
    mutationFn: () =>
      api.startExecution(
        tourId,
        {
          latitude: 0,
          longitude: 0,
        },
        token
      ),

    onSuccess: (execution) => {
      navigate(`/tours/${tourId}/run/${execution.id}`);
    },
  });

  return (
    <Btn
      variant="primary"
      size="vlg"
      icon="compass"
      onClick={() => startMut.mutate()}
      disabled={startMut.isPending}
      style={{ position: 'absolute', bottom: 24, right: 24}}
    >
      {startMut.isPending ? 'Starting…' : 'Start tour'}
    </Btn>
  );
}

export default function PublicTourDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusMessage, setStatusMessage] = useState(null);

  const { data: tour, isLoading, error } = useQuery({
    queryKey: ['public-tour', id],
    queryFn: () => api.getPublicTour(id, token),
    enabled: Boolean(id && token),
    refetchOnMount: 'always',
  });

  const addToCartMut = useMutation({
    mutationFn: () => api.addToCart({
      tour_id: tour.id,
      tour_name: tour.name,
      tour_description: tour.description,
      price: tour.price,
    }, token),
    onSuccess: () => {
      setStatusMessage('Added to cart successfully.');
      qc.invalidateQueries({ queryKey: ['public-tour', id] });
    },
    onError: (e) => {
      setStatusMessage(e.message);
    },
  });

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (error) return <div className="container" style={{ padding: 40 }}><ErrBanner>{error.message}</ErrBanner></div>;
  if (!tour) return <div className="container" style={{ padding: 40 }}>Tour not found.</div>;

  const mapPoints = tour.keyPoints && tour.keyPoints.length > 0
    ? tour.keyPoints
    : tour.firstKeyPoint ? [tour.firstKeyPoint] : [];

  const center = mapPoints.length > 0
    ? [mapPoints[0].latitude, mapPoints[0].longitude]
    : [46.37, 14.10];
  const zoom = mapPoints.length > 0 ? 13 : 4;

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/browse')} style={{ marginBottom: 16 }}>
        <Icon d={ICONS.chevL} size={14} /> Back to tours
      </button>

      {/* Header */}
      <div className="card p-24 fade-up" style={{ marginBottom: 20, position: 'relative' }}>
        <div className="row gap-12 wrap" style={{ marginBottom: 8 }}>
          <Difficulty value={tour.difficulty} />
        </div>
        <h1 style={{ marginTop: 4, fontSize: 36 }}>{tour.name}</h1>
        <p className="muted" style={{ maxWidth: 700, fontSize: 15, marginTop: 8 }}>{tour.description}</p>
        <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
          {tour.tags.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
        <div className="row gap-24" style={{ marginTop: 18 }}>
          <div className="stat">
            <span className="v">
              {tour.lengthInKm != null ? tour.lengthInKm.toFixed(1) : '—'}
              <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}> km</span>
            </span>
            <span className="l">Distance</span>
          </div>
          <div className="stat">
            <span className="v" style={{ fontFamily: 'var(--serif)' }}>€{tour.price}</span>
            <span className="l">Price</span>
          </div>
        </div>
        <div className="row gap-8 wrap" style={{ marginTop: 14 }}>
          {tour.durations.map((d) => (
            <TransportPill key={d.id} type={d.transportType} mins={d.durationInMinutes} />
          ))}
        </div>
        <div className="row gap-12" style={{ marginTop: 18, alignItems: 'center' }}>
          {tour.isPurchased ? (
            <span className="badge badge-success">Purchased</span>
          ) : (
            <Btn variant="primary" onClick={() => addToCartMut.mutate()} disabled={addToCartMut.isLoading}>
              {addToCartMut.isLoading ? 'Adding…' : 'Add to cart'}
            </Btn>
            
          )}
          {statusMessage && <span className="faint" style={{ fontSize: 13 }}>{statusMessage}</span>}
        </div>
        {tour.isPurchased && <StartTourButton tourId={id} token={token} navigate={navigate} />}
      </div>

      {/* Map + key point list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card fade-up" style={{ padding: 16 }}>
          <span className="eyebrow">The route</span>
          <h3 style={{ marginTop: 4, marginBottom: 12 }}>Map &amp; key points</h3>
          <div style={{ height: 460, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0' }}>
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                subdomains="abc"
                attribution="© OpenStreetMap contributors"
                maxZoom={19}
              />
              {mapPoints.map((kp, i) => (
                <Marker key={kp.id || i} position={[kp.latitude, kp.longitude]} icon={makeKpIcon(i, i === 0)}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--sage-darker)', marginBottom: 4 }}>{kp.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{kp.description}</div>
                      {kp.imageUrl && (
                        <img src={kp.imageUrl} alt={kp.name}
                          style={{ width: '100%', borderRadius: 6, marginTop: 8, objectFit: 'cover', maxHeight: 120 }} />
                      )}
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -24]} opacity={0.95}>{kp.name}</Tooltip>
                </Marker>
              ))}
              {tour?.keyPoints?.length > 1 && <RouteLayer keyPoints={tour?.keyPoints} />}
            </MapContainer>
          </div>
        </div>

        {/* Key points list */}
        <div className="card fade-up p-20">
          <span className="eyebrow">Route details</span>
          <h3 style={{ marginTop: 4, marginBottom: 12 }}>{tour.isPurchased ? 'All key points' : 'First stop'}</h3>
          {mapPoints.length === 0 ? (
            <div className="empty" style={{ padding: 22 }}>
              <p style={{ margin: 0 }}>No stops listed yet.</p>
            </div>
          ) : tour.isPurchased ? (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mapPoints.map((kp, index) => (
                <li key={kp.id || index} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '10px 0', borderTop: index === 0 ? 'none' : '0.5px dashed var(--sage-line)' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: index === 0 ? 'var(--sage-deep)' : 'var(--terracotta)', color: 'var(--paper)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600,
                  }}>{index + 1}</span>
                  <div>
                    <h4 style={{ fontSize: 15, margin: 0 }}>{kp.name}</h4>
                    <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{kp.description}</p>
                    {kp.imageUrl && (
                      <img src={kp.imageUrl} alt={kp.name}
                        style={{ width: '100%', borderRadius: 8, marginTop: 8, objectFit: 'cover', maxHeight: 140 }} />
                    )}
                    <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
                      {kp.latitude.toFixed(3)}, {kp.longitude.toFixed(3)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '10px 0' }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--sage-deep)', color: 'var(--paper)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600,
              }}>1</span>
              <div>
                <h4 style={{ fontSize: 15 }}>{mapPoints[0].name}</h4>
                <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{mapPoints[0].description}</p>
                {mapPoints[0].imageUrl && (
                  <img src={mapPoints[0].imageUrl} alt={mapPoints[0].name}
                    style={{ width: '100%', borderRadius: 8, marginTop: 8, objectFit: 'cover', maxHeight: 140 }} />
                )}
                <p className="faint" style={{ fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>
                  Further stops are revealed after purchase.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
       <ReviewSection tourId={id} token={token} isPurchased={tour.isPurchased} />
    </div>
  );
}
