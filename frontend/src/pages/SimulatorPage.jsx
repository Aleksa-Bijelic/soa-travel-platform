import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/stakeholdersApi';
import { useAuth } from '../context/AuthContext';
import { Btn, ErrBanner } from '../components';

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

export default function SimulatorPage() {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [err, setErr] = useState(null);
  const [success, setSuccess] = useState(null);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfileByUsername(token, user.username),
    enabled: Boolean(token),
  });

  const mutation = useMutation({
    mutationFn: (location) => api.updateProfile(location, token),
    onSuccess: () => {
      setSuccess('Location saved successfully.');
      setErr(null);
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => {
      setErr(e.message);
      setSuccess(null);
    },
  });

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (error) return <div className="container" style={{ padding: 40 }}><ErrBanner>{error.message}</ErrBanner></div>;

  const currentLat = profile?.current_latitude;
  const currentLng = profile?.current_longitude;
  const defaultCenter = [50.0, 10.0];
  const mapCenter = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : currentLat != null && currentLng != null
      ? [currentLat, currentLng]
      : defaultCenter;
  const mapZoom = selectedLocation || (currentLat != null && currentLng != null) ? 13 : 4;

  const saveLocation = () => {
    if (!selectedLocation) {
      setErr('Click on the map first to choose your simulated location.');
      setSuccess(null);
      return;
    }
    mutation.mutate({
      current_latitude: selectedLocation.lat,
      current_longitude: selectedLocation.lng,
    });
  };

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <span className="eyebrow">Simulator</span>
          <h1 style={{ marginTop: 4 }}>Tourist location simulator</h1>
        </div>
        <Btn variant="primary" onClick={() => saveLocation()} disabled={mutation.isLoading}>
          {mutation.isLoading ? 'Saving…' : 'Save location'}
        </Btn>
      </div>

      {err && <div style={{ marginBottom: 16 }}><ErrBanner onClose={() => setErr(null)}>{err}</ErrBanner></div>}
      {success && <div style={{ marginBottom: 16 }}><div className="card card-warm p-16">{success}</div></div>}

      <div className="card fade-up" style={{ padding: 16, minHeight: 520 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <p className="muted" style={{ margin: 0, maxWidth: 620 }}>
              Click anywhere on the map to simulate your current position. <br />Your location is saved to your profile.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--ink)', fontWeight: 700 }}>Saved position</div>
            <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
              {currentLat != null && currentLng != null
                ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
                : 'Not defined yet'}
            </div>
          </div>
        </div>

        <div style={{ height: 420, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #c8d5c0' }}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                subdomains="abc"
              attribution="© OpenStreetMap contributors"
              maxZoom={19}
            />
            <MapClickHandler onClick={(latlng) => {
              setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
              setErr(null);
              setSuccess(null);
            }} />
            {currentLat != null && currentLng != null && (
              <Marker position={[currentLat, currentLng]}>
                <Popup>Saved position</Popup>
              </Marker>
            )}
            {selectedLocation && (
              <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                <Popup>New simulated position</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="card-warm card p-16 fade-up" style={{ marginTop: 14 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0 }}>Simulator details</h4>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Click once on the map to choose the position and then press Save location.
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 260 }}>
              <div style={{ marginBottom: 4 }}><strong>Selected:</strong></div>
              <div style={{ color: 'var(--ink-faint)' }}>
                {selectedLocation ? `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}` : 'No selection yet'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
