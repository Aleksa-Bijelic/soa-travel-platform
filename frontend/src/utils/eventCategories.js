// Shared metadata for event categories (activities + guided tours).
// Slugs match the reservation-service API (activity_type / synthetic "tour_session").

export const FIXED_ACTIVITY_CAPACITY = 100;

export const EVENT_CATEGORIES = [
  {
    key: 'all',
    label: 'All',
    apiType: null,
    apiCategory: null,
    badgeBg: 'var(--ink-soft)',
    cover: null,
  },
  {
    key: 'tour_session',
    label: 'Guided tours',
    apiType: 'tour_session',
    apiCategory: null,
    badgeBg: 'var(--sage-deep)',
    cover:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80&fm=webp',
  },
  {
    key: 'concert',
    label: 'Concerts',
    apiType: 'activity',
    apiCategory: 'concert',
    badgeBg: '#8e44ad',
    cover:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&fm=webp',
  },
  {
    key: 'theater',
    label: 'Theatre',
    apiType: 'activity',
    apiCategory: 'theater',
    badgeBg: '#b03a2e',
    cover:
      'https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=800&q=80&fm=webp',
  },
  {
    key: 'open_air_cinema',
    label: 'Open-air cinema',
    apiType: 'activity',
    apiCategory: 'open_air_cinema',
    badgeBg: '#1a5276',
    cover:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&fm=webp',
  },
];

export const ACTIVITY_OPTIONS = EVENT_CATEGORIES.filter((c) =>
  ['concert', 'theater', 'open_air_cinema'].includes(c.key),
);

// Legacy activity types (workshop/adventure/cultural/transport) can still
// exist in old data — map them to a generic label instead of crashing.
const LEGACY_LABELS = {
  workshop: 'Workshop',
  adventure: 'Adventure',
  cultural: 'Cultural',
  transport: 'Transport',
};

export function getCategoryKey(ev) {
  if (!ev) return 'all';
  if (ev.event_type === 'tour_session') return 'tour_session';
  if (ev.activity_type && EVENT_CATEGORIES.some((c) => c.key === ev.activity_type)) {
    return ev.activity_type;
  }
  return 'activity';
}

export function getCategoryMeta(ev) {
  const key = getCategoryKey(ev);
  return EVENT_CATEGORIES.find((c) => c.key === key) || null;
}

export function categoryLabel(ev) {
  const meta = getCategoryMeta(ev);
  if (meta && meta.key !== 'activity') return meta.label;
  if (ev?.activity_type && LEGACY_LABELS[ev.activity_type]) {
    return LEGACY_LABELS[ev.activity_type];
  }
  if (ev?.event_type === 'activity') return 'Activity';
  return meta?.label || '';
}

export function eventCover(ev) {
  if (ev?.image_url) return ev.image_url;
  const meta = getCategoryMeta(ev);
  return meta?.cover || null;
}

export function formatEventDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Selectable seat counts for activities + their hall layouts.
// All options divide evenly into rows (240 = 15 × 16).
export const ACTIVITY_CAPACITY_OPTIONS = [
  { value: 30, rows: 5, cols: 6, hint: '5 rows × 6 seats' },
  { value: 80, rows: 8, cols: 10, hint: '8 rows × 10 seats' },
  { value: 240, rows: 15, cols: 16, hint: '15 rows × 16 seats' },
  { value: 400, rows: 20, cols: 20, hint: '20 rows × 20 seats' },
];

// buildSeatRows(capacity) → { rows: [[seatNr...], ...], cols, rowCount }
// Seats are numbered row-major 1..capacity; rows are as even as possible
// so any capacity renders a balanced cinema-style hall.
export function buildSeatRows(capacity) {
  const opt = ACTIVITY_CAPACITY_OPTIONS.find((o) => o.value === capacity);
  let rowCount;
  let cols;
  if (opt) {
    rowCount = opt.rows;
    cols = opt.cols;
  } else {
    cols = 10;
    rowCount = Math.max(1, Math.ceil(capacity / cols));
  }
  const base = Math.floor(capacity / rowCount);
  const extra = capacity % rowCount;
  const rows = [];
  let n = 1;
  for (let r = 0; r < rowCount; r++) {
    const count = base + (r < extra ? 1 : 0);
    const row = [];
    for (let i = 0; i < count; i++) row.push(n++);
    rows.push(row);
  }
  return { rows, cols, rowCount };
}

export function rowLabel(i) {
  // A, B, … Z, AA, AB, …
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
