import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMapEvents, useMap } from 'react-leaflet';
import { api } from '../api/tourApi';
import { useAuth } from '../context/AuthContext';
import { Btn, ErrBanner, Icon, ICONS } from '../components';
import { formatDate } from '../utils/helpers';
import L from 'leaflet';

function makeKpIcon(index, isFirst, isCompleted) {
  const bg = isCompleted ? 'var(--sage-deep)' : isFirst ? 'var(--terracotta)' : 'var(--ink-faint)';
  return L.divIcon({
    html: `<div class="kp-marker" style="background:${bg}"><span>${isCompleted ? '✓' : index + 1}</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function makeTouristIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--gold);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });

  return null;
}

export default function ActiveTourPage() {
  const { tourId, executionId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [notification, setNotification] = useState(null);
  const [err, setErr] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);

  const { data: tour } = useQuery({
    queryKey: ['public-tour', tourId],
    queryFn: () => api.getPublicTour(tourId, token),
    enabled: Boolean(tourId && token),
  });

  const { data: execution, refetch: refetchExecution } = useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => api.getExecutionById(tourId, executionId, token),
    enabled: Boolean(tourId && token),
  });

  const checkPositionMut = useMutation({
    mutationFn: async () => {
      if (!currentPosition) {
        throw new Error('Click on the map to set your simulated position.');
      }

      return api.checkPosition(tourId, executionId,
        {
           latitude: currentPosition.lat,
           longitude: currentPosition.lng,
        },
       token
       );
    },
    onSuccess: (result) => {
      refetchExecution();
      if (result.nearKeyPoint) {
        setNotification({
          type: 'success',
          message: `You reached "${result.keyPointName}"!`,
        });
        setTimeout(() => setNotification(null), 4000);
      }
      if (result.tourCompleted) {
        setNotification({
          type: 'complete',
          message: 'You completed the entire tour!',
        });
      }
    },
    onError: (e) => setErr(e.message),
  });

  const completeMut = useMutation({
    mutationFn: () => api.completeExecution(tourId, executionId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['execution'] });
      navigate(`/browse/${tourId}`);
    },
    onError: (e) => setErr(e.message),
  });

  const abandonMut = useMutation({
    mutationFn: () => api.abandonExecution(tourId, executionId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['execution'] });
      navigate(`/browse/${tourId}`);
    },
    onError: (e) => setErr(e.message),
  });


  useEffect(() => {
    if (!execution || execution.status !== 'Active') return;
    if (!currentPosition) return;

    const interval = setInterval(() => {
       checkPositionMut.mutate();
    }, 10000);
    return () => clearInterval(interval);
  }, [execution?.id, execution?.status, currentPosition]);

  if (!tour || !execution) return <div className="container" style={{ padding: 40 }}>Loading…</div>;

  const keyPoints = tour.keyPoints ?? [];
  const completedIds = new Set(execution.completedKeyPointIds ?? []);
  const center = keyPoints[0] ? [keyPoints[0].latitude, keyPoints[0].longitude] : [46.37, 14.10];

  const progress = keyPoints.length > 0 ? Math.round((completedIds.size / keyPoints.length) * 100) : 0;

  const isActive = execution.status === 'Active';

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/browse/${tourId}`)} style={{ marginBottom: 16 }}>
        <Icon d={ICONS.chevL} size={14} /> Back to tour
      </button>

      <div className="card p-24 fade-up" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <span className="eyebrow">Active session</span>
            <h1 style={{ marginTop: 4, fontSize: 30 }}>{tour.name}</h1>
            <p className="faint" style={{ marginTop: 4, fontSize: 13 }}>
              Started {formatDate(execution.startedAt)}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 160 }}>
            <span className={`badge ${execution.status === 'Active' ? 'badge-published' : 'badge-archived'}`}>
              <span className="dot" />{execution.status}
            </span>
            {isActive && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="secondary" size="sm" icon="close"
                  disabled={abandonMut.isPending}
                  onClick={() => abandonMut.mutate()}>
                  Abandon
                </Btn>
                <Btn variant="primary" size="sm" icon="check"
                  disabled={completeMut.isPending}
                  onClick={() => completeMut.mutate()}>
                  Complete
                </Btn>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span className="faint">{completedIds.size} of {keyPoints.length} key points reached</span>
            <span style={{ fontWeight: 600, color: 'var(--sage-deep)' }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--sage-line)', borderRadius: 999 }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'var(--sage-deep)',
              width: `${progress}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {notification && (
        <div className="card fade-up p-16" style={{
          marginBottom: 16,
          background: notification.type === 'complete' ? 'var(--st-pub-bg)' : 'var(--paper-deep)',
          border: `0.5px solid ${notification.type === 'complete' ? 'var(--sage-deep)' : 'var(--sage-line)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
             width: 34,
             height: 34,
             borderRadius: '50%',
             background: notification.type === 'complete' ? 'var(--sage-deep)' : 'var(--paper)',
             border: `1px solid ${
                 notification.type === 'complete' ? 'var(--sage-deep)' : 'var(--sage-line)'
             }`,
             display: 'grid',
             placeItems: 'center',
             flexShrink: 0,
          }}>
          <Icon d={notification.type === 'complete' ? ICONS.check : ICONS.location}
                size={16}
                color={notification.type === 'complete' ? 'var(--paper)' : 'var(--sage-deep)' }
          />
         </div>
          <span style={{ fontWeight: 600, color: 'var(--sage-darker)' }}>{notification.message}</span>
          <button className="btn-icon" onClick={() => setNotification(null)} style={{ marginLeft: 'auto' }}>
            <Icon d={ICONS.close} size={14} />
          </button>
        </div>
      )}

      {err && <div style={{ marginBottom: 16 }}><ErrBanner onClose={() => setErr(null)}>{err}</ErrBanner></div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card fade-up" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Live map</span>
              <h3 style={{ marginTop: 4 }}>Your position</h3>
            </div>
            {isActive && (
              <Btn variant="ghost" size="sm" icon="compass"
                disabled={checkPositionMut.isPending}
                onClick={() => checkPositionMut.mutate()}>
                {checkPositionMut.isPending ? 'Checking…' : 'Check now'}
              </Btn>
            )}
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
               Click anywhere on the map to simulate your movement.
          </p>
          <div style={{ height: 460, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                subdomains="abc"
                attribution="© OpenStreetMap contributors"
                maxZoom={19}
              />
              <MapClickHandler
                 onMapClick={(latlng) => {
                   setCurrentPosition({
                      lat: latlng.lat,
                      lng: latlng.lng,
                   });

                   setErr(null);
                }}
              />
              {keyPoints.map((kp, i) => (
                <Marker key={kp.id} position={[kp.latitude, kp.longitude]}
                  icon={makeKpIcon(i, i === 0, completedIds.has(kp.id))}>
                  <Tooltip direction="top" offset={[0, -24]} opacity={0.95}>{kp.name}</Tooltip>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--sage-darker)' }}>{kp.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{kp.description}</div>
                      {completedIds.has(kp.id) && (
                        <div style={{ marginTop: 6, color: 'var(--sage-deep)', fontWeight: 600, fontSize: 12 }}>✓ Reached</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {keyPoints.length > 1 && <RouteLayer keyPoints={keyPoints} />}
              {currentPosition && (
                <>
                  <Marker position={[currentPosition.lat, currentPosition.lng]} icon={makeTouristIcon()}>
                    <Popup>Your simulated position</Popup>
                  </Marker>
                  <Circle center={[currentPosition.lat, currentPosition.lng]} radius={50}
                    pathOptions={{ color: 'var(--gold)', fillColor: 'var(--gold)', fillOpacity: 0.15 }} />
                </>
              )}
            </MapContainer>
          </div>
          {currentPosition ? (
            <p className="faint" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Your position: {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)} · Updates every 10s
            </p>
          ) : (
            <p className="faint" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              No position selected yet — click on the map to start simulating movement.
            </p>
          )}
        </div>

        <div className="card fade-up p-20">
          <span className="eyebrow">Stops</span>
          <h3 style={{ marginTop: 4, marginBottom: 12 }}>Key points</h3>
          {keyPoints.length === 0 ? (
            <div className="empty" style={{ padding: 22 }}>
              <p style={{ margin: 0 }}>No key points on this tour.</p>
            </div>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {keyPoints.map((kp, i, arr) => {
                const done = completedIds.has(kp.id);
                return (
                  <li key={kp.id} style={{
                    display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12,
                    padding: '12px 0',
                    borderTop: i === 0 ? 'none' : '0.5px dashed var(--sage-line)',
                    opacity: done ? 1 : 0.7,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: done ? 'var(--sage-deep)' : i === 0 ? 'var(--terracotta)' : 'var(--paper-deep)',
                        color: done ? 'var(--paper)' : i === 0 ? 'var(--paper)' : 'var(--ink-faint)',
                        border: done || i === 0 ? 'none' : '1.5px solid var(--sage-line)',
                        display: 'grid', placeItems: 'center',
                        fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600,
                        transition: 'background 0.3s ease',
                      }}>{done ? '✓' : i + 1}</span>
                      {i < arr.length - 1 && (
                        <span style={{ width: 1.5, flex: 1, background: 'var(--sage-line)', marginTop: 4, minHeight: 18 }} />
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, margin: 0, color: done ? 'var(--sage-darker)' : 'var(--ink)' }}>{kp.name}</h4>
                      <p className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{kp.description}</p>
                      {done && (
                        <span style={{ fontSize: 11, color: 'var(--sage-deep)', fontWeight: 600 }}>✓ Reached</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}