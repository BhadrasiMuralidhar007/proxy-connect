const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

function getToken() {
  return localStorage.getItem('pc_token');
}

export { getToken };

export function setToken(token) {
  localStorage.setItem('pc_token', token);
}

export function clearToken() {
  localStorage.removeItem('pc_token');
}

export function isLoggedIn() {
  return !!getToken();
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch itself throws when the server is unreachable (down, wrong port,
    // CORS blocked). Make that distinguishable from an API-level error.
    throw new Error(
      `Couldn't reach the server at ${API_BASE}. Is the backend running? (${networkErr.message})`
    );
  }

  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Response wasn't JSON at all (e.g. a stack-trace HTML error page).
    // Surface a snippet of it instead of a silent generic message.
    if (!res.ok) {
      throw new Error(`Server error (${res.status}): ${rawText.slice(0, 200) || res.statusText}`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status} ${res.statusText}).`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/profile/me', { auth: true }),
  profileById: (id) => request(`/profile/${id}`, { auth: true }),
  updateLocation: (latitude, longitude) =>
    request('/profile/location', { method: 'PUT', body: { latitude, longitude }, auth: true }),
  nearby: (radiusKm) =>
    request(`/discovery/nearby${radiusKm ? `?radiusKm=${radiusKm}` : ''}`, { auth: true }),
  chatHistory: (otherUserId) => request(`/chat/history/${otherUserId}`, { auth: true }),
};

export const WS_BASE = API_BASE.replace(/\/api$/, '') + '/ws';
