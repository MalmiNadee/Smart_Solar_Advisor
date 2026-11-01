const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const FD_API_BASE_URL = import.meta.env.VITE_FD_API_BASE_URL;

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Store auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Get auth token (exported for use in AuthContext)
export { getAuthToken };

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    const token = data.data?.token;

    if (token) {
      setAuthToken(token);
    }

    // Also call Fault Detection backend to login simultaneously
    try {
      let fdResponse = await fetch(`${FD_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // If user is missing from Fault Detection, create them seamlessly
      if (!fdResponse.ok) {
        const fallbackName = data.data?.user?.name || email.split('@')[0];
        await fetch(`${FD_API_BASE_URL}/auth/createUser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fallbackName, email, password }),
        });

        // Try login again
        fdResponse = await fetch(`${FD_API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      if (fdResponse.ok) {
        const fdData = await fdResponse.json();
        if (fdData.success && fdData.token) {
          localStorage.setItem('fd_token', fdData.token);
        }
      }
    } catch (err) {
      console.error("FaultDetection login error:", err);
    }

    return data.data;
  },
  logout: () => {
    removeAuthToken();
    localStorage.removeItem('fd_token');
  },
  getProfile: async () => {
    return apiRequest<{
      id: string;
      email: string;
      role: string;
    }>("/auth/profile");
  },
  verifyAdmin: async () => {
    return apiRequest<{ isAdmin: boolean; email: string }>("/auth/verify-admin");
  },
};

// Sites API
export const sitesAPI = {
  getAll: async (filters?: { status?: string; customer?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.customer) params.append("customer", filters.customer);

    const query = params.toString();
    return apiRequest<Array<any>>(`/sites${query ? `?${query}` : ""}`);
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
    }>("/sites/stats");
  },
  create: async (siteData: any) => {
    return apiRequest<any>("/sites", {
      method: "POST",
      body: JSON.stringify(siteData),
    });
  },
  update: async (siteId: string, siteData: any) => {
    return apiRequest<any>(`/sites/${siteId}`, {
      method: "PUT",
      body: JSON.stringify(siteData),
    });
  },
  delete: async (siteId: string) => {
    return apiRequest<void>(`/sites/${siteId}`, {
      method: "DELETE",
    });
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

// Users API
export const usersAPI = {
  getAll: async () => {
    return apiRequest<Array<any>>("/users");
  },
  getById: async (userId: string) => {
    return apiRequest<any>(`/users/${userId}`);
  },
  create: async (userData: { email: string; password: string; name: string; role?: string }) => {
    // 1. Call SmartSolar Backend
    const response = await apiRequest<any>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    // 2. Call Fault Detection Backend to also create the user
    try {
      await fetch(`${FD_API_BASE_URL}/auth/createUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Use the same data
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        }),
      });
    } catch (fdCreateError) {
      console.error("FaultDetection user creation error:", fdCreateError);
    }

    return response;
  },
  update: async (userId: string, userData: any) => {
    return apiRequest<any>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },
  delete: async (userId: string) => {
    return apiRequest<void>(`/users/${userId}`, {
      method: "DELETE",
    });
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
    const dateParam = date ? `?date=${date}` : "";
    return apiRequest<{ date: string; totalKwh: number; readingsCount: number }>(
      `/predictions/${customerName}/${siteId}/daily${dateParam}`
    );
  },
  getMonthlyTotal: async (customerName: string, siteId: string, yearMonth?: string) => {
    const monthParam = yearMonth ? `?yearMonth=${yearMonth}` : "";
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
  getCurrent: async (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat != null) params.append("lat", String(lat));
    if (lon != null) params.append("lon", String(lon));
    const q = params.toString();
    return apiRequest<any>(`/weather/current${q ? `?${q}` : ""}`);
  },
  getForecast: async (lat?: number, lon?: number, days: number = 7) => {
    const params = new URLSearchParams();
    if (lat != null) params.append("lat", String(lat));
    if (lon != null) params.append("lon", String(lon));
    params.append("days", String(days));
    return apiRequest<any>(`/weather/forecast?${params}`);
  },
  getSeasonal: async (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat != null) params.append("lat", String(lat));
    if (lon != null) params.append("lon", String(lon));
    const q = params.toString();
    return apiRequest<any>(`/weather/seasonal${q ? `?${q}` : ""}`);
  },
  getFullYearForecast: async (customerName: string, siteId: string, lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat != null) params.append("lat", String(lat));
    if (lon != null) params.append("lon", String(lon));
    const q = params.toString();
    return apiRequest<any>(`/weather/full-year-forecast/${customerName}/${siteId}${q ? `?${q}` : ""}`);
  },
};

// Explainability API
export const explainabilityAPI = {
  explainLow: async (customerName: string, siteId: string, date?: string, threshold?: number) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (threshold != null) params.append("threshold", String(threshold));
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/explain-low${q ? `?${q}` : ""}`);
  },
  getLowPredictionDates: async (
    customerName: string,
    siteId: string,
    days?: number,
    threshold?: number
  ) => {
    const params = new URLSearchParams();
    if (days != null) params.append("days", String(days));
    if (threshold != null) params.append("threshold", String(threshold));
    const q = params.toString();
    return apiRequest<{
      averageDailyKwh: number;
      threshold: number;
      count: number;
      daysAnalyzed: number;
      lowPredictionDays: Array<{
        date: string;
        dateStr: string;
        predictedKwh: number;
        averageKwh: number;
        percentage: number;
        factors: any[];
        recommendations: string[];
        explanationText: string;
      }>;
    }>(`/predictions/${customerName}/${siteId}/low-prediction-dates${q ? `?${q}` : ""}`);
  },
  getFeatureImportance: async (customerName: string, siteId: string) => {
    return apiRequest<{
      features: Array<{ name: string; importance: number }>;
      method: string;
      note?: string;
    }>(`/predictions/${customerName}/${siteId}/feature-importance`);
  },
  getShapExplanation: async (customerName: string, siteId: string, timestamp: string) => {
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/explain/${timestamp}`);
  },
  getLimeExplanation: async (customerName: string, siteId: string, timestamp: string) => {
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/explain-lime/${timestamp}`);
  },
  getMonthlyAdjusted: async (customerName: string, siteId: string, yearMonth?: string, lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (yearMonth) params.append("yearMonth", yearMonth);
    if (lat != null) params.append("lat", String(lat));
    if (lon != null) params.append("lon", String(lon));
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/monthly-adjusted${q ? `?${q}` : ""}`);
  },
  getDailyAnalysis: async (customerName: string, siteId: string, date?: string, includeXai: boolean = false) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (includeXai) params.append("includeXai", "true");
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/daily-analysis${q ? `?${q}` : ""}`);
  },
  getTimeSeriesForecast: async (
    customerName: string,
    siteId: string,
    days?: number,
    periods?: number,
    model?: "prophet" | "sarima"
  ) => {
    const params = new URLSearchParams();
    if (days != null) params.append("days", String(days));
    if (periods != null) params.append("periods", String(periods));
    if (model) params.append("model", model);
    const q = params.toString();
    return apiRequest<any>(`/predictions/${customerName}/${siteId}/timeseries-forecast${q ? `?${q}` : ""}`);
  },
  getGlobalXaiSummary: async (
    customerName: string,
    siteId: string,
    days?: number
  ) => {
    const params = new URLSearchParams();
    if (days != null) params.append("days", String(days));
    const q = params.toString();
    return apiRequest<{
      summaryText: string;
      daysAnalyzed: number;
      lowDaysCount: number;
      factorsSummary: Array<{ name: string; count: number; impacts: string[] }>;
      lowPredictionDays: any[];
    }>(`/predictions/${customerName}/${siteId}/xai-summary${q ? `?${q}` : ""}`);
  },
};

