const BASE = '';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 304) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.status === 304) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export const reservationApi = {
  getEvents: (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return req('GET', `/reservations/events${qs ? '?' + qs : ''}`, undefined, token);
  },

  getEvent: (id, token) =>
    req('GET', `/reservations/events/${id}`, undefined, token),

  getSeats: (eventId, token) =>
    req('GET', `/reservations/events/${eventId}/seats`, undefined, token),

  createEvent: (data, token) =>
    req('POST', '/reservations/events', data, token),

  reserveSeat: (eventId, seatNumber, token) =>
    req('POST', `/reservations/events/${eventId}/reserve`, { seat_number: seatNumber }, token),

  getMyReservations: (token) =>
    req('GET', '/reservations/reservations/my', undefined, token),

  cancelReservation: (id, token) =>
    req('DELETE', `/reservations/reservations/${id}`, undefined, token),

  confirmReservation: (id, token) =>
    req('PUT', `/reservations/reservations/${id}/confirm`, undefined, token),
};
