import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { api } from '../api/tourApi';
import { useAuth } from '../context/AuthContext';
import { Btn, StatusBadge, Difficulty, Tag, TransportPill, ErrBanner, Icon, ICONS } from '../components';
import { formatDate } from '../utils/helpers';

import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import DeleteModal from '../components/DeleteModal';

function makeKpIcon(index, isFirst) {
  return L.divIcon({
    html: `<div class="kp-marker ${isFirst ? 'kp-marker-first' : ''}"><span>${index + 1}</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function makeEditIcon(index) {
  return L.divIcon({
    html: `<div class="kp-marker kp-marker-editing"><span>${index + 1}</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function makePendingIcon() {
  return L.divIcon({
    html: `<div class="kp-marker" style="background:var(--gold)"><span>+</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function FitBounds({ keyPoints }) {
  const map = useMap();
  useEffect(() => {
    if (keyPoints.length > 0) {
      const bounds = L.latLngBounds(keyPoints.map((k) => [k.latitude, k.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [keyPoints.length]);
  return null;
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

export default function TourDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [err, setErr] = useState(null);
  const [pendingPin, setPendingPin] = useState(null);
  const [kpForm, setKpForm] = useState({ name: '', description: '', imageUrl: '' });
  const [durForm, setDurForm] = useState({ transportType: 'Walking', durationInMinutes: 60 });
  const [draftForm, setDraftForm] = useState({ name: '', description: '', difficulty: 'Medium', tagsRaw: '', price: 0 });
  const [showDraftEditor, setShowDraftEditor] = useState(false);

  const [editingKp, setEditingKp] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', imageUrl: '' });
  const [editPendingPin, setEditPendingPin] = useState(null);
  const [editReposition, setEditReposition] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: tour, isLoading, error: loadErr } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => api.getTour(id, token),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tour', id] });
    qc.invalidateQueries({ queryKey: ['my-tours'] });
  };

  useEffect(() => {
    if (!tour) return;
    setDraftForm({
      name: tour.name,
      description: tour.description,
      difficulty: tour.difficulty,
      tagsRaw: (tour.tags || []).join(', '),
      price: tour.price ?? 0,
    });
  }, [tour]);

  const publishMut = useMutation({
    mutationFn: () => api.publishTour(id, token),
    onSuccess: invalidate,
    onError: (e) => setErr(e.message),
  });
  const archiveMut = useMutation({
    mutationFn: () => api.archiveTour(id, token),
    onSuccess: invalidate,
    onError: (e) => setErr(e.message),
  });
  const activateMut = useMutation({
    mutationFn: () => api.activateTour(id, token),
    onSuccess: invalidate,
    onError: (e) => setErr(e.message),
  });
  const updateTourMut = useMutation({
    mutationFn: (data) => api.updateTour(id, data, token),
    onSuccess: () => {
      invalidate();
      setErr(null);
      setShowDraftEditor(false);
    },
    onError: (e) => setErr(e.message),
  });
  const kpMut = useMutation({
    mutationFn: (data) => api.addKeyPoint(id, data, token),
    onSuccess: () => {
      invalidate();
      setPendingPin(null);
      setKpForm({ name: '', description: '', imageUrl: '' });
    },
    onError: (e) => setErr(e.message),
  });
  const updateKpMut = useMutation({
    mutationFn: ({ kpId, data }) => api.updateKeyPoint(id, kpId, data, token),
    onSuccess: () => {
      invalidate();
      setEditingKp(null);
      setEditPendingPin(null);
      setEditReposition(false);
    },
    onError: (e) => setErr(e.message),
  });
  const deleteKpMut = useMutation({
    mutationFn: (kpId) => api.deleteKeyPoint(id, kpId, token),
    onSuccess: () => {
      invalidate();
      if (editingKp) { setEditingKp(null); setEditPendingPin(null); setEditReposition(false); }
    },
    onError: (e) => setErr(e.message),
  });
  const durMut = useMutation({
    mutationFn: (data) => api.addDuration(id, data, token),
    onSuccess: () => {
      invalidate();
      setDurForm({ transportType: 'Walking', durationInMinutes: 60 });
    },
    onError: (e) => setErr(e.message),
  });

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (loadErr) return <div className="container" style={{ padding: 40 }}><ErrBanner>{loadErr.message}</ErrBanner></div>;
  if (!tour) return <div className="container" style={{ padding: 40 }}>Tour not found.</div>;

  const keyPoints = [...(tour.keyPoints || [])].sort((a, b) => a.order - b.order);
  const center = keyPoints[0] ? [keyPoints[0].latitude, keyPoints[0].longitude] : [46.37, 14.10];

  const tryPublish = () => {
    if (keyPoints.length < 2) { setErr('Tour must have at least 2 key points before it can be published.'); return; }
    if ((tour.durations || []).length < 1) { setErr('Add at least one duration estimate before publishing.'); return; }
    setErr(null);
    publishMut.mutate();
  };

  const addKeyPoint = () => {
    if (!pendingPin) return;
    if (!kpForm.name.trim()) { setErr('Give the key point a name.'); return; }
    setErr(null);
    kpMut.mutate({
      name: kpForm.name.trim(),
      description: kpForm.description.trim(),
      latitude: pendingPin.lat,
      longitude: pendingPin.lng,
      imageUrl: kpForm.imageUrl.trim() || null,
    });
  };

  const openEditKp = (kp) => {
    if (tour.status !== 'Draft') return;

    setPendingPin(null);
    setEditingKp(kp);
    setEditForm({ name: kp.name, description: kp.description || '', imageUrl: kp.imageUrl || '' });
    setEditPendingPin(null);
    setEditReposition(false);
  };

  const cancelEdit = () => {
    setEditingKp(null);
    setEditPendingPin(null);
    setEditReposition(false);
  };

  const saveEditKp = () => {
    if (!editForm.name.trim()) { setErr('Name is required.'); return; }
    setErr(null);
    const coords = editPendingPin
      ? { latitude: editPendingPin.lat, longitude: editPendingPin.lng }
      : { latitude: editingKp.latitude, longitude: editingKp.longitude };
    updateKpMut.mutate({
      kpId: editingKp.id,
      data: {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        imageUrl: editForm.imageUrl.trim() || null,
        ...coords,
      },
    });
  };

  const handleMapClick = (latlng) => {
    if (tour.status !== 'Draft') return;

    if (editReposition) {
      setEditPendingPin({ lat: latlng.lat, lng: latlng.lng });
      setEditReposition(false);
      return;
    }
    if (!editingKp) {
      setPendingPin({ lat: latlng.lat, lng: latlng.lng });
      setKpForm({ name: '', description: '', imageUrl: '' });
    }
  };

  const addDuration = () => {
    durMut.mutate({
      transportType: durForm.transportType,
      durationInMinutes: Number(durForm.durationInMinutes) || 0,
    });
  };

  const saveDraft = () => {
    if (!draftForm.name.trim()) { setErr('Give your tour a name.'); return; }
    if (!draftForm.description.trim()) { setErr('Add a short description for travellers.'); return; }
    if (!draftForm.tagsRaw.trim()) { setErr('Add at least one tag.'); return; }
    setErr(null);
    updateTourMut.mutate({
      name: draftForm.name.trim(),
      description: draftForm.description.trim(),
      difficulty: draftForm.difficulty,
      tags: draftForm.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      price: Number(draftForm.price) || 0,
    });
  };

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-tours')} style={{ marginBottom: 16 }}>
        <Icon d={ICONS.chevL} size={14} /> All my tours
      </button>

      {/* Header */}
      <div className="card p-24 fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 20 }}>
        <div className="col gap-8" style={{ minWidth: 0 }}>
          <div className="row gap-12 wrap">
            <StatusBadge status={tour.status} />
            <Difficulty value={tour.difficulty} />
            <span className="faint" style={{ fontSize: 13 }}>· created {formatDate(tour.createdAt)}</span>
          </div>
          <h1 style={{ marginTop: 4, fontSize: 36 }}>{tour.name}</h1>
          <p className="muted" style={{ maxWidth: 700, fontSize: 15 }}>{tour.description}</p>
          <div className="row gap-6 wrap" style={{ marginTop: 6 }}>
            {tour.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <div className="row gap-24" style={{ marginTop: 14 }}>
            <div className="stat">
              <span className="v">
                {tour.lengthInKm != null ? tour.lengthInKm.toFixed(1) : '—'}
                <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}> km</span>
              </span>
              <span className="l">Distance</span>
            </div>
            <div className="stat">
              <span className="v">{keyPoints.length}</span>
              <span className="l">Key points</span>
            </div>
            <div className="stat">
              <span className="v">{(tour.durations || []).length}</span>
              <span className="l">Durations</span>
            </div>
            <div className="stat">
              <span className="v">€{tour.price}</span>
              <span className="l">Price</span>
            </div>
          </div>
        </div>
        <div className="col gap-8" style={{ alignItems: 'stretch', minWidth: 200 }}>
          {tour.status === 'Draft' && (
            <Btn variant="ghost" size="sm" icon={showDraftEditor ? 'close' : 'edit'} onClick={() => setShowDraftEditor((prev) => !prev)}>
              {showDraftEditor ? 'Hide editor' : 'Edit draft'}
            </Btn>
          )}
          {tour.status === 'Draft' && (
            <Btn variant="primary" icon="upload" disabled={publishMut.isPending} onClick={tryPublish}>
              Publish tour
            </Btn>
          )}
          {tour.status === 'Published' && (
            <Btn variant="secondary" icon="archive" disabled={archiveMut.isPending} onClick={() => archiveMut.mutate()}>
              Archive
            </Btn>
          )}
          {tour.status === 'Archived' && (
            <Btn variant="primary" icon="refresh" disabled={activateMut.isPending} onClick={() => activateMut.mutate()}>
              Reactivate
            </Btn>
          )}
          <span className="faint" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 4 }}>
            {tour.status === 'Published' ? `Live since ${formatDate(tour.publishedAt)}`
              : tour.status === 'Archived' ? `Archived ${formatDate(tour.archivedAt)}`
                : 'Not visible to travellers'}
          </span>
        </div>
      </div>

      {tour.status === 'Draft' && showDraftEditor && (
        <div className="card fade-up p-24" style={{ marginBottom: 20 }}>
          <div className="row between" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <div>
              <span className="eyebrow">Draft</span>
              <h3 style={{ marginTop: 4 }}>Edit tour draft</h3>
              <p className="muted" style={{ marginTop: 8, maxWidth: 620 }}>
                This tour is still private. Update the title, description, price and tags here.
              </p>
            </div>
            <Btn variant="primary" size="sm" onClick={saveDraft} disabled={updateTourMut.isPending}>
              {updateTourMut.isPending ? 'Saving…' : 'Save changes'}
            </Btn>
          </div>

          <div className="col gap-16">
            <div className="field">
              <label className="field-label">Tour name</label>
              <input className="input" value={draftForm.name}
                onChange={(e) => setDraftForm({ ...draftForm, name: e.target.value })} />
            </div>

            <div className="field">
              <label className="field-label">Description</label>
              <textarea className="textarea" rows={3}
                value={draftForm.description}
                onChange={(e) => setDraftForm({ ...draftForm, description: e.target.value })} />
            </div>

            <div className="row gap-16" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Difficulty</label>
                <select className="select" value={draftForm.difficulty}
                  onChange={(e) => setDraftForm({ ...draftForm, difficulty: e.target.value })}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Price</label>
                <input className="input" type="number" min={0} step="0.50" value={draftForm.price}
                  onChange={(e) => setDraftForm({ ...draftForm, price: Number(e.target.value) })} />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tags</label>
              <input className="input" value={draftForm.tagsRaw}
                onChange={(e) => setDraftForm({ ...draftForm, tagsRaw: e.target.value })}
                placeholder="lake, alps, sunrise" />
              <span className="field-hint">Comma-separated tags help travellers find your tour.</span>
            </div>
          </div>
        </div>
      )}

      {err && <div style={{ marginBottom: 16 }}><ErrBanner onClose={() => setErr(null)}>{err}</ErrBanner></div>}

      {/* Map + right panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Map */}
        <div className="card fade-up" style={{ padding: 16 }}>
          <div className="row between" style={{ marginBottom: 12, alignItems: 'baseline' }}>
            <div>
              <span className="eyebrow">The route</span>
              <h3 style={{ marginTop: 4 }}>Map &amp; key points</h3>
            </div>
            <span className="hand">click the map to drop a pin</span>
          </div>

          <div style={{ height: 460, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0' }}>
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                subdomains="abc"
                attribution="© OpenStreetMap contributors"
                maxZoom={19}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {keyPoints.length > 0 && <FitBounds keyPoints={keyPoints} />}
              {keyPoints.length > 1 && <RouteLayer keyPoints={keyPoints} />}
              {keyPoints.map((kp, i) => {
                const isEditing = editingKp?.id === kp.id;
                const pos = isEditing && editPendingPin ? [editPendingPin.lat, editPendingPin.lng] : [kp.latitude, kp.longitude];
                return <Marker key={kp.id} position={pos} icon={isEditing ? makeEditIcon(i) : makeKpIcon(i, i === 0)} eventHandlers={{ click: () => openEditKp(kp) }}>
                  <Tooltip direction="top" offset={[0, -24]} opacity={0.95}>{kp.name}</Tooltip>
                </Marker>;
              })}
              {pendingPin && !editingKp && (
                <Marker position={[pendingPin.lat, pendingPin.lng]} icon={makePendingIcon()} />
              )}
            </MapContainer>
          </div>

          {pendingPin && !editingKp && tour.status === 'Draft' && (
            <div className="card-warm card p-16 fade-up" style={{ marginTop: 14 }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h4>New key point</h4>
                <span className="faint" style={{ fontSize: 12 }}>
                  {pendingPin.lat.toFixed(4)}°, {pendingPin.lng.toFixed(4)}°
                </span>
              </div>
              <div className="col gap-12">
                <div className="field">
                  <label className="field-label">Name</label>
                  <input className="input" placeholder="e.g. Wooden bridge"
                    value={kpForm.name} onChange={(e) => setKpForm({ ...kpForm, name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="textarea" rows={2} placeholder="A short note for travellers…"
                    value={kpForm.description} onChange={(e) => setKpForm({ ...kpForm, description: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Image URL (optional)</label>
                  <input className="input" placeholder="https://…"
                    value={kpForm.imageUrl} onChange={(e) => setKpForm({ ...kpForm, imageUrl: e.target.value })} />
                </div>
                <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" size="sm" onClick={() => setPendingPin(null)}>Cancel</Btn>
                  <Btn variant="primary" size="sm" icon="plus" onClick={addKeyPoint} disabled={kpMut.isPending}>
                    {kpMut.isPending ? 'Adding…' : 'Add key point'}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {editingKp && (
            <div className="card p-16 fade-up" style={{ marginTop: 14, borderLeft: '3px solid var(--terracotta)' }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h4>Edit key point</h4>
                <span className="faint" style={{ fontSize: 12 }}>
                  {editPendingPin ? `${editPendingPin.lat.toFixed(4)}°, ${editPendingPin.lng.toFixed(4)}° (new)` : `${editingKp.latitude.toFixed(4)}°, ${editingKp.longitude.toFixed(4)}°`}
                </span>
              </div>
              <div className="col gap-12">
                <div className="field">
                  <label className="field-label">Name</label>
                  <input className="input" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="textarea" rows={2} value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Image URL (optional)</label>
                  <input className="input" placeholder="https://…" value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
                </div>

                <div className="field">
                  <label className="field-label">Position</label>
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <Btn variant="ghost" size="sm"
                      onClick={() => { setEditReposition(true); }}
                      disabled={editReposition}
                      icon={editReposition ? 'clock' : 'pin'}>
                      {editReposition ? 'Click on the map…' : 'Reposition'}
                    </Btn>
                    {editPendingPin && <Btn variant="ghost" size="sm" onClick={() => setEditPendingPin(null)}>Reset</Btn>}
                  </div>
                </div>

                <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Btn>
                  <Btn variant="primary" size="sm" onClick={saveEditKp} disabled={updateKpMut.isPending}>
                    {updateKpMut.isPending ? 'Saving…' : 'Save changes'}
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col gap-16">
          {/* Key points list */}
          <div className="card fade-up p-20">
            <div className="row between" style={{ marginBottom: 10, alignItems: 'baseline' }}>
              <div>
                <span className="eyebrow">Stops</span>
                <h3 style={{ marginTop: 4 }}>{keyPoints.length} key point{keyPoints.length !== 1 ? 's' : ''}</h3>
              </div>
            </div>
            {keyPoints.length === 0 ? (
              <div className="empty" style={{ padding: 22 }}>
                <p style={{ margin: 0 }}>Click anywhere on the map to add the first stop.</p>
              </div>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {keyPoints.map((kp, i, arr) => (
                  <li key={kp.id} style={{
                    display: 'grid', gridTemplateColumns: '32px 1fr 42px', gap: 12,
                    padding: '10px 0',
                    borderTop: i === 0 ? 'none' : '0.5px dashed var(--sage-line)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: i === 0 ? 'var(--sage-deep)' : 'var(--terracotta)',
                        color: 'var(--paper)',
                        display: 'grid', placeItems: 'center',
                        fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600,
                      }}>{i + 1}</span>
                      {i < arr.length - 1 && (
                        <span style={{ width: 1.5, flex: 1, background: 'var(--sage-line)', marginTop: 4, minHeight: 18 }} />
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15 }}>{kp.name}</h4>
                      <span className="faint" style={{ fontSize: 11 }}>{kp.latitude.toFixed(3)}, {kp.longitude.toFixed(3)}</span>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{kp.description}</p>
                      {kp.imageUrl && (
                        <img src={kp.imageUrl} alt={kp.name}
                          style={{ width: '100%', borderRadius: 8, marginTop: 8, objectFit: 'cover', maxHeight: 160 }} />
                      )}
                    </div>
                    {tour.status === 'Draft' && <div>
                      <Btn variant="ghost" icon='trash' size="sm" title="Delete key point"
                        onClick={() => setDeleteTarget({ id: kp.id, name: kp.name })}
                        disabled={deleteKpMut.isPending} />
                    </div>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Durations */}
          <div className="card fade-up p-20">
            <div className="row between" style={{ marginBottom: 12, alignItems: 'baseline' }}>
              <div>
                <span className="eyebrow">Travel time</span>
                <h3 style={{ marginTop: 4 }}>Durations</h3>
              </div>
            </div>

            {(tour.durations || []).length === 0 ? (
              <p className="muted" style={{ fontSize: 13.5 }}>No estimates yet — at least one is required to publish.</p>
            ) : (
              <div className="row gap-8 wrap" style={{ marginBottom: 14 }}>
                {tour.durations.map((d) => (
                  <TransportPill key={d.id} type={d.transportType} mins={d.durationInMinutes} />
                ))}
              </div>
            )}

            <hr className="hr-dashed" style={{ margin: '10px 0 14px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <div className="field">
                <label className="field-label">Transport</label>
                <select className="select" value={durForm.transportType}
                  onChange={(e) => setDurForm({ ...durForm, transportType: e.target.value })}>
                  <option value="Walking">Walking</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Minutes</label>
                <input className="input" type="number" min={1} value={durForm.durationInMinutes}
                  onChange={(e) => setDurForm({ ...durForm, durationInMinutes: e.target.value })} />
              </div>
              <div className="field">
                <label className="field-label" style={{ visibility: 'hidden' }}>·</label>
                <Btn variant="primary" icon="plus" size="sm" onClick={addDuration} disabled={durMut.isPending}>
                  Add
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      {deleteTarget && <DeleteModal title="Delete key point" message={`Delete "${deleteTarget.name}"? This cannot be undone.`} isPending={deleteKpMut.isPending}
        onConfirm={() => {
          deleteKpMut.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)} />
      }
    </div>
  );
}
