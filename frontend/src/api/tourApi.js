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
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

async function reqForm(method, path, formData, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData,
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 304) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.status === 304) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

export const api = {
  createTour: (data, token) =>
    req('POST', '/tours/tours', data, token),

  getMyTours: (token) =>
    req('GET', '/tours/tours/my', undefined, token),

  getTour: (id, token) =>
    req('GET', `/tours/tours/${id}`, undefined, token),

  getPublicTour: (id, token) =>
    req('GET', `/tours/tours/${id}/public`, undefined, token),

  getPublishedTours: (token) =>
    req('GET', '/tours/tours/published', undefined, token),

  publishTour: (id, token) =>
    req('PUT', `/tours/tours/${id}/publish`, null, token),

  updateTour: (id, data, token) =>
    req('PUT', `/tours/tours/${id}`, data, token),

  archiveTour: (id, token) =>
    req('PUT', `/tours/tours/${id}/archive`, null, token),

  activateTour: (id, token) =>
    req('PUT', `/tours/tours/${id}/activate`, null, token),

  addKeyPoint: (tourId, data, token) =>
    req('POST', `/tours/tours/${tourId}/keypoints`, data, token),

  updateKeyPoint: (tourId, keypointId, data, token) =>
    req('PUT', `/tours/tours/${tourId}/keypoints/${keypointId}`, data, token),

  deleteKeyPoint: (tourId, keypointId, token) =>
    req('DELETE', `/tours/tours/${tourId}/keypoints/${keypointId}`, undefined, token),

  getKeyPoints: (tourId, token) =>
    req('GET', `/tours/tours/${tourId}/keypoints`, undefined, token),

  addDuration: (tourId, data, token) =>
    req('POST', `/tours/tours/${tourId}/durations`, data, token),

  getAllUsers: (token) =>
    req('GET', '/stakeholders/admin/users', undefined, token),

  blockUser: (id, token) =>
    req('PUT', `/stakeholders/admin/users/${id}/block`, null, token),

  getCart: (token) =>
    req('GET', '/purchase/cart', undefined, token),

  addToCart: (data, token) =>
    req('POST', '/purchase/cart', data, token),

  removeCartItem: (itemId, token) =>
    req('DELETE', `/purchase/cart/${itemId}`, undefined, token),

  checkoutCart: (token) =>
    req('POST', '/purchase/checkout', null, token),

  getPurchases: (token) =>
    req('GET', '/purchase/purchases', undefined, token),

  getPurchaseStatus: (tourId, token) =>
    req('GET', `/purchase/status/${tourId}`, undefined, token),

  getReviews: (tourId, token) =>
    req('GET', `/tours/tours/${tourId}/reviews`, undefined, token),

  createReview: (tourId, data, token) =>
    req('POST', `/tours/tours/${tourId}/reviews`, data, token),

  startExecution: (tourId, data, token) =>
    req('POST', `/tours/tours/${tourId}/executions/start`, data, token),

  getActiveExecution: (tourId, token) =>
    req('GET', `/tours/tours/${tourId}/executions/active`, undefined, token),

  checkPosition: (tourId, executionId, data, token) =>
    req('POST', `/tours/tours/${tourId}/executions/${executionId}/check-position`, data, token),

  completeExecution: (tourId, executionId, token) =>
    req('POST', `/tours/tours/${tourId}/executions/${executionId}/complete`, null, token),

  abandonExecution: (tourId, executionId, token) =>
    req('POST', `/tours/tours/${tourId}/executions/${executionId}/abandon`, null, token),

  getExecutionById: (tourId, executionId, token) =>
    req('GET', `/tours/tours/${tourId}/executions/${executionId}`, undefined, token),

  uploadTourImage: (file, token) => {
    const formData = new FormData();
    formData.append('file', file);
    return reqForm('POST', '/tours/tours/images', formData, token);
  },
};
