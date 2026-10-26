/**
 * Centralised API client for Coffee N Cue frontend.
 * All calls go to the Express backend at NEXT_PUBLIC_API_URL.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const config = {
    credentials: 'include', // send HTTP-only cookies
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  }

  const res = await fetch(url, config)

  // Handle auth expiry
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data.message || 'Unauthorised', 401)
  }

  const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }))

  if (!res.ok) {
    throw new ApiError(data.message || `HTTP ${res.status}`, res.status, data.errors)
  }

  return data
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

// ── Auth ──────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
}

// ── Categories ────────────────────────────────────────────────────────
export const categories = {
  list: (params = {}) => request('/categories?' + new URLSearchParams(params)),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
}

// ── Menu ──────────────────────────────────────────────────────────────
export const menu = {
  list: (params = {}) => request('/menu?' + new URLSearchParams(params)),
  get: (id) => request(`/menu/${id}`),
  create: (data) => request('/menu', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/menu/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
}

// ── Orders ────────────────────────────────────────────────────────────
export const orders = {
  list: (params = {}) => request('/orders?' + new URLSearchParams(params)),
  get: (id) => request(`/orders/${id}`),
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancel: (id, reason) => request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
}

// ── Payments ──────────────────────────────────────────────────────────
export const payments = {
  list: (orderId) => request(`/orders/${orderId}/payments`),
  record: (orderId, data) => request(`/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  refund: (paymentId, notes) => request(`/payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify({ notes }) }),
}

// ── Dashboard ─────────────────────────────────────────────────────────
export const dashboard = {
  summary: (params = {}) => request('/dashboard/summary?' + new URLSearchParams(params)),
}

// ── Reports ───────────────────────────────────────────────────────────
export const reports = {
  summary: (params = {}) => request('/reports/summary?' + new URLSearchParams(params)),
  exportOrders: (params = {}) => `${BASE_URL}/reports/export/orders?${new URLSearchParams(params)}`,
  exportMonthly: (params = {}) => `${BASE_URL}/reports/export/monthly?${new URLSearchParams(params)}`,
  exportDaily: (params = {}) => `${BASE_URL}/reports/export/daily?${new URLSearchParams(params)}`,
  exportCustom: (params = {}) => `${BASE_URL}/reports/export/custom?${new URLSearchParams(params)}`,
}

// ── Expenses ──────────────────────────────────────────────────────────
export const expenses = {
  list: (params = {}) => request('/expenses?' + new URLSearchParams(params)),
  get: (id) => request(`/expenses/${id}`),
  create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
}

// ── Expense Categories ────────────────────────────────────────────────
export const expenseCategories = {
  list: (params = {}) => request('/expense-categories?' + new URLSearchParams(params)),
  create: (data) => request('/expense-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/expense-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/expense-categories/${id}`, { method: 'DELETE' }),
}
