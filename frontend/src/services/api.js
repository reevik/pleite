const API_BASE = '/api';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    // Token expired or invalid — clear it so UI redirects to login
    localStorage.removeItem('token');
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Investments
export const investmentApi = {
  getAll: () => request('/investments'),
  getById: (id) => request(`/investments/${id}`),
  create: (data) => request('/investments', { method: 'POST', body: JSON.stringify(data) }),
  createBatch: (data) => request('/investments/batch', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/investments/${id}`, { method: 'DELETE' }),
  getSummary: () => request('/investments/summary'),
  getMonthlyReturns: () => request('/investments/monthly-returns'),
  getWealthDevelopment: () => request('/investments/wealth-development'),
  buy: (id, data) => request(`/investments/${id}/buy`, { method: 'POST', body: JSON.stringify(data) }),
  sell: (id, data) => request(`/investments/${id}/sell`, { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (id) => request(`/investments/${id}/transactions`),
  getAllTransactions: () => request('/investments/transactions'),
  undoTransaction: (txId) => request(`/investments/transactions/${txId}/undo`, { method: 'POST' }),
};

// Market Data
export const marketApi = {
  getQuote: (ticker) => request(`/market/quote/${ticker}`),
  getQuotes: (tickers) => request(`/market/quotes?tickers=${tickers.join(',')}`),
  search: (query) => request(`/market/search?q=${encodeURIComponent(query)}`),
  getProfile: (ticker) => request(`/market/profile/${ticker}`),
  getChart: (ticker, range = '1d', interval = '5m') =>
    request(`/market/chart/${ticker}?range=${range}&interval=${interval}`),
  getFundamentals: (ticker) => request(`/market/fundamentals/${ticker}`),
  getHoldings: (ticker) => request(`/market/holdings/${ticker}`),
};

// Watchlist
export const watchlistApi = {
  getAll: () => request('/watchlist'),
  add: (data) => request('/watchlist', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => request(`/watchlist/${id}`, { method: 'DELETE' }),
};

// PDF Upload
export const pdfApi = {
  parse: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/parse`, {
      method: 'POST', body: formData, headers: authHeader(),
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  },
};
