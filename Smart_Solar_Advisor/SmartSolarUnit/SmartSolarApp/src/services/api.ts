import { API_BASE_URL } from '../constants/api';
import { storage } from './storage';

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await storage.getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    const token = data.data?.token;
    
    if (token) {
      await storage.setToken(token);
    }

    return data.data;
  },
  
  logout: async () => {
    await storage.removeToken();
    await storage.removeUser();
  },
  
  getProfile: async () => {
    return apiRequest<{
      id: string;
      email: string;
      role: string;
      customer_name?: string;
      name?: string;
    }>('/auth/profile');
  },
  
  updateProfile: async (profileData: { name?: string; email?: string; customer_name?: string }) => {
    return apiRequest<{
      id: string;
      email: string;
      role: string;
      customer_name?: string;
      name?: string;
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Sites API
export const sitesAPI = {
  getAll: async (filters?: { status?: string; customer?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer) params.append('customer', filters.customer);
    
    const query = params.toString();
    return apiRequest<Array<any>>(`/sites${query ? `?${query}` : ''}`);
  },
  
  getById: async (siteId: string) => {
    return apiRequest<any>(`/sites/${siteId}`);
  },
  
  getStats: async () => {
    return apiRequest<{
      total: number;
      running: number;
      completed: number;
      maintenance: number;
      totalCapacity: number;
    }>('/sites/stats');
  },
};

// Sensors API
export const sensorsAPI = {
  getDeviceData: async (deviceId: string) => {
    return apiRequest<Array<any>>(`/sensors/${deviceId}`);
  },
  
  getLatest: async (deviceId: string) => {
    return apiRequest<any>(`/sensors/${deviceId}/latest`);
  },
  
  getRecent: async (deviceId: string, limit: number = 50) => {
    return apiRequest<Array<any>>(`/sensors/${deviceId}/recent?limit=${limit}`);
  },
  
  getByRange: async (deviceId: string, startTime: string, endTime: string) => {
    return apiRequest<Array<any>>(
      `/sensors/${deviceId}/range?startTime=${startTime}&endTime=${endTime}`
    );
  },
};

// Predictions API
export const predictionsAPI = {
  getAll: async (customerName: string, siteId: string) => {
    return apiRequest<Array<any>>(`/predictions/${customerName}/${siteId}`);
  },
  
  getLatest: async (customerName: string, siteId: string) => {
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/latest`);
  },
  
  getSummary: async (customerName: string, siteId: string) => {
    return apiRequest<{
      daily: { date: string; totalKwh: number; readingsCount: number };
      monthly: { yearMonth: string; totalKwh: number; readingsCount: number };
      latest: any;
    }>(`/predictions/${customerName}/${siteId}/summary`);
  },
  
  getDailyTotal: async (customerName: string, siteId: string, date?: string) => {
    const dateParam = date ? `?date=${date}` : '';
    return apiRequest<{ date: string; totalKwh: number; readingsCount: number }>(
      `/predictions/${customerName}/${siteId}/daily${dateParam}`
    );
  },
  
  getMonthlyTotal: async (customerName: string, siteId: string, yearMonth?: string) => {
    const monthParam = yearMonth ? `?yearMonth=${yearMonth}` : '';
    return apiRequest<{ yearMonth: string; totalKwh: number; readingsCount: number }>(
      `/predictions/${customerName}/${siteId}/monthly${monthParam}`
    );
  },
  
  getByRange: async (customerName: string, siteId: string, startDate: string, endDate: string) => {
    return apiRequest<Array<any>>(
      `/predictions/${customerName}/${siteId}/range?startDate=${startDate}&endDate=${endDate}`
    );
  },

  getMonthlyBreakdown: async (customerName: string, siteId: string) => {
    return apiRequest<Array<{
      yearMonth: string;
      yearMonthLabel: string;
      month: number;
      year: number;
      totalKwh: number;
      readingsCount: number;
    }>>(`/predictions/${customerName}/${siteId}/monthly-breakdown`);
  },
};

// Weather API (seasonal trend forecasting)
export const weatherAPI = {
  getSeasonal: async (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', String(lat));
    if (lon != null) params.append('lon', String(lon));
    const q = params.toString();
    return apiRequest<any>(`/weather/seasonal${q ? `?${q}` : ''}`);
  },

  getFullYearForecast: async (customerName: string, siteId: string, lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', String(lat));
    if (lon != null) params.append('lon', String(lon));
    const q = params.toString();
    return apiRequest<any>(`/weather/full-year-forecast/${customerName}/${siteId}${q ? `?${q}` : ''}`);
  },
};

// Explainability + XAI API
export const explainabilityAPI = {
  getDailyAnalysis: async (
    customerName: string,
    siteId: string,
    date?: string,
    includeXai: boolean = false
  ) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (includeXai) params.append('includeXai', 'true');
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/daily-analysis${q ? `?${q}` : ''}`);
  },

  getTimeSeriesForecast: async (
    customerName: string,
    siteId: string,
    days?: number,
    periods?: number,
    model?: 'prophet' | 'sarima'
  ) => {
    const params = new URLSearchParams();
    if (days != null) params.append('days', String(days));
    if (periods != null) params.append('periods', String(periods));
    if (model) params.append('model', model);
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/timeseries-forecast${q ? `?${q}` : ''}`);
  },

  getFeatureImportance: async (customerName: string, siteId: string) => {
    return apiRequest<{
      features: Array<{ name: string; importance: number }>;
      method: string;
      note?: string;
    }>(`/predictions/${customerName}/${siteId}/feature-importance`);
  },

  getGlobalXaiSummary: async (customerName: string, siteId: string, days?: number) => {
    const params = new URLSearchParams();
    if (days != null) params.append('days', String(days));
    const q = params.toString();
    return apiRequest<{
      summaryText: string;
      daysAnalyzed: number;
      lowDaysCount: number;
      factorsSummary?: Array<{ name: string; count: number; impacts: string[] }>;
      lowPredictionDays: any[];
    }>(`/predictions/${customerName}/${siteId}/xai-summary${q ? `?${q}` : ''}`);
  },
};


