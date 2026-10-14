// Базовый слой работы с Laravel API.
// В продакшене фронтенд и API живут на одном домене, поэтому по умолчанию — относительный /api.

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'phonefix_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function request(path, { method = 'GET', body, params, auth = false } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const headers = { Accept: 'application/json' }
  const token = getToken()

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(url.toString().replace(window.location.origin, ''), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    throw new ApiError('Сервер недоступен. Проверьте подключение к интернету.', 0)
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload.message ||
      (payload.errors ? Object.values(payload.errors).flat()[0] : null) ||
      'Не удалось выполнить запрос.'

    throw new ApiError(message, response.status, payload.errors || {})
  }

  return payload
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

// Публичные разделы
export const publicApi = {
  site: () => api.get('/public/site'),
  home: () => api.get('/public/home'),
  services: (params) => api.get('/public/services', { params }),
  service: (slug) => api.get(`/public/services/${slug}`),
  technicians: () => api.get('/public/technicians'),
  technician: (id) => api.get(`/public/technicians/${id}`),
  slots: (id, params) => api.get(`/public/technicians/${id}/slots`, { params }),
  reviews: (params) => api.get('/public/reviews', { params }),
  articles: () => api.get('/public/articles'),
  article: (slug) => api.get(`/public/articles/${slug}`),
  createLead: (body) => api.post('/public/leads', body),
}

// Авторизация и личный кабинет
export const authApi = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  me: () => api.get('/auth/me', { auth: true }),
  logout: () => api.post('/auth/logout', {}, { auth: true }),
  updateProfile: (body) => api.patch('/auth/profile', body, { auth: true }),
}

export const clientApi = {
  appointments: (params) => api.get('/appointments', { params, auth: true }),
  appointment: (id) => api.get(`/appointments/${id}`, { auth: true }),
  createAppointment: (body) => api.post('/appointments', body, { auth: true }),
  cancelAppointment: (id) => api.patch(`/appointments/${id}/cancel`, {}, { auth: true }),
  createReview: (id, body) => api.post(`/appointments/${id}/review`, body, { auth: true }),
  myReviews: () => api.get('/reviews/my', { auth: true }),
  messages: (id) => api.get(`/appointments/${id}/messages`, { auth: true }),
  sendMessage: (id, body) => api.post(`/appointments/${id}/messages`, { body }, { auth: true }),
}

// Админ-панель
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard', { auth: true }),

  appointments: (params) => api.get('/admin/appointments', { params, auth: true }),
  appointment: (id) => api.get(`/admin/appointments/${id}`, { auth: true }),
  updateAppointment: (id, body) => api.patch(`/admin/appointments/${id}`, body, { auth: true }),
  deleteAppointment: (id) => api.delete(`/admin/appointments/${id}`, { auth: true }),

  services: (params) => api.get('/admin/services', { params, auth: true }),
  createService: (body) => api.post('/admin/services', body, { auth: true }),
  updateService: (id, body) => api.put(`/admin/services/${id}`, body, { auth: true }),
  deleteService: (id) => api.delete(`/admin/services/${id}`, { auth: true }),

  technicians: () => api.get('/admin/technicians', { auth: true }),
  createTechnician: (body) => api.post('/admin/technicians', body, { auth: true }),
  updateTechnician: (id, body) => api.put(`/admin/technicians/${id}`, body, { auth: true }),
  deleteTechnician: (id) => api.delete(`/admin/technicians/${id}`, { auth: true }),

  schedule: (params) => api.get('/admin/schedule', { params, auth: true }),
  addScheduleSlot: (body) => api.post('/admin/schedule', body, { auth: true }),
  deleteScheduleSlot: (id) => api.delete(`/admin/schedule/${id}`, { auth: true }),

  reviews: (params) => api.get('/admin/reviews', { params, auth: true }),
  updateReview: (id, body) => api.patch(`/admin/reviews/${id}`, body, { auth: true }),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`, { auth: true }),

  leads: (params) => api.get('/admin/leads', { params, auth: true }),
  updateLead: (id, body) => api.patch(`/admin/leads/${id}`, body, { auth: true }),
  deleteLead: (id) => api.delete(`/admin/leads/${id}`, { auth: true }),

  articles: () => api.get('/admin/articles', { auth: true }),
  createArticle: (body) => api.post('/admin/articles', body, { auth: true }),
  updateArticle: (id, body) => api.put(`/admin/articles/${id}`, body, { auth: true }),
  deleteArticle: (id) => api.delete(`/admin/articles/${id}`, { auth: true }),

  users: (params) => api.get('/admin/users', { params, auth: true }),
  createUser: (body) => api.post('/admin/users', body, { auth: true }),
  updateUser: (id, body) => api.patch(`/admin/users/${id}`, body, { auth: true }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`, { auth: true }),

  settings: () => api.get('/admin/settings', { auth: true }),
  saveSettings: (settings) => api.put('/admin/settings', { settings }, { auth: true }),

  notifications: () => api.get('/admin/notifications', { auth: true }),
  messages: (id) => api.get(`/admin/appointments/${id}/messages`, { auth: true }),
  sendMessage: (id, body) => api.post(`/admin/appointments/${id}/messages`, { body }, { auth: true }),
}