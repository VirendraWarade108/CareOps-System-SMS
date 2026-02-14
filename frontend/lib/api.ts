import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============== AUTH ==============
export const auth = {
  register: async (data: { email: string; password: string; full_name?: string }) => {
    const response = await api.post('/api/auth/register', data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  },
};

// ============== WORKSPACES ==============
export const workspaces = {
  create: async (data: any) => {
    const response = await api.post('/api/workspaces', data);
    return response.data;
  },

  list: async () => {
    const response = await api.get('/api/workspaces');
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/api/workspaces/${id}`);
    return response.data;
  },

  getDashboardStats: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/dashboard/stats`);
    return response.data;
  },
};

// ============== BOOKINGS ==============
export const bookings = {
  create: async (workspaceId: string, data: any) => {
    const response = await api.post(`/api/workspaces/${workspaceId}/bookings`, data);
    return response.data;
  },

  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/bookings`);
    return response.data;
  },

  updateStatus: async (bookingId: string, status: string) => {
    const response = await api.patch(`/api/bookings/${bookingId}`, { status });
    return response.data;
  },
};

// ============== CONTACTS ==============
export const contacts = {
  create: async (workspaceId: string, data: any) => {
    const response = await api.post(`/api/workspaces/${workspaceId}/contacts`, data);
    return response.data;
  },

  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/contacts`);
    return response.data;
  },
};

// ============== CONVERSATIONS ==============
export const conversations = {
  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/conversations`);
    return response.data;
  },

  getMessages: async (conversationId: string) => {
    const response = await api.get(`/api/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (conversationId: string, content: string, channel = 'email') => {
    const response = await api.post(`/api/conversations/${conversationId}/messages`, {
      content,
      channel,
    });
    return response.data;
  },
};

// ============== FORMS ==============
export const forms = {
  getSubmissions: async (workspaceId: string, status?: string) => {
    const url = status
      ? `/api/workspaces/${workspaceId}/form-submissions?status=${status}`
      : `/api/workspaces/${workspaceId}/form-submissions`;
    const response = await api.get(url);
    return response.data;
  },

  updateSubmission: async (submissionId: string, status: string) => {
    const response = await api.patch(`/api/form-submissions/${submissionId}`, { status });
    return response.data;
  },
};

// ============== INVENTORY ==============
export const inventory = {
  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/inventory`);
    return response.data;
  },

  create: async (workspaceId: string, data: any) => {
    const response = await api.post(`/api/workspaces/${workspaceId}/inventory`, data);
    return response.data;
  },

  update: async (itemId: string, data: any) => {
    const response = await api.patch(`/api/inventory/${itemId}`, data);
    return response.data;
  },

  recordUsage: async (itemId: string, data: any) => {
    const response = await api.post(`/api/inventory/${itemId}/usage`, data);
    return response.data;
  },
};

// ============== ALERTS ==============
export const alerts = {
  list: async (workspaceId: string, unreadOnly = false) => {
    const response = await api.get(
      `/api/workspaces/${workspaceId}/alerts${unreadOnly ? '?unread_only=true' : ''}`
    );
    return response.data;
  },

  markRead: async (alertId: string) => {
    const response = await api.patch(`/api/alerts/${alertId}/read`);
    return response.data;
  },
};

// ============== PUBLIC API (no auth) ==============
export const publicApi = {
  getWorkspace: async (slug: string) => {
    const response = await axios.get(`${API_URL}/api/public/workspaces/${slug}`);
    return response.data;
  },

  getServices: async (slug: string) => {
    const response = await axios.get(`${API_URL}/api/public/workspaces/${slug}/services`);
    return response.data;
  },

  createBooking: async (slug: string, data: any) => {
    const response = await axios.post(`${API_URL}/api/public/workspaces/${slug}/bookings`, data);
    return response.data;
  },

  submitContactForm: async (slug: string, data: any) => {
    const response = await axios.post(`${API_URL}/api/public/workspaces/${slug}/contact`, data);
    return response.data;
  },

  update: async (workspaceId: string, data: any) => {
    const response = await api.patch(`/api/workspaces/${workspaceId}`, data);
    return response.data;
  },
  
  getIntegrations: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/integrations`);
    return response.data;
  },
};