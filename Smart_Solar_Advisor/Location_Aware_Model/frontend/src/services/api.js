import axios from "axios";

const API_BASE_URL = "http://localhost:5009/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token expired or invalid
      if (
        error.response?.status === 401 ||
        (error.response?.status === 422 &&
          error.response?.data?.error?.includes("token"))
      ) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getCurrentUser: () => api.get("/auth/me"),
};

// Predictions API
export const predictionsAPI = {
  predict: (data) => api.post("/predictions/predict", data),
  predictDaily: (data) => api.post("/predictions/predict/daily", data),
  predictAnnual: (data) => api.post("/predictions/predict/annual", data),
  getHistory: () => api.get("/predictions/history"),
  deletePrediction: (id) => api.delete(`/predictions/history/${id}`),
  comparePredictions: (predictionIds) =>
    api.post("/predictions/compare", { prediction_ids: predictionIds }),
  getRecommendations: (predictionId) =>
    api.post("/predictions/recommendations", { prediction_id: predictionId }),
};

// Admin API
export const adminAPI = {
  getAllUsers: () => api.get("/admin/users"),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAllPredictions: () => api.get("/admin/predictions"),
  getStatistics: () => api.get("/admin/statistics"),
  toggleAdmin: (id) => api.patch(`/admin/users/${id}/toggle-admin`),
  deletePrediction: (id) => api.delete(`/predictions/admin/${id}`),
};

// Weather API
export const weatherAPI = {
  getWeatherData: (lat, lon) => api.get(`/weather/data?lat=${lat}&lon=${lon}`),
  getForecast: (lat, lon) => api.get(`/weather/forecast?lat=${lat}&lon=${lon}`),
};

// IoT API
export const iotAPI = {
  getSensorData: (locationId) => api.get(`/iot/sensors/${locationId}`),
  submitSensorData: (data) => api.post("/iot/sensors", data),
  getAnomalies: () => api.get("/iot/anomalies"),
};

// Export API
export const exportAPI = {
  exportPredictionsCSV: () =>
    api.get("/export/predictions/csv", { responseType: "blob" }),
  exportPredictionsJSON: () =>
    api.get("/export/predictions/json", { responseType: "blob" }),
  exportPredictionsExcel: () =>
    api.get("/export/predictions/excel", { responseType: "blob" }),
  exportAnnualExcel: (year, latitude, longitude) => {
    const params = new URLSearchParams({ year });
    if (latitude) params.append("latitude", latitude);
    if (longitude) params.append("longitude", longitude);
    return api.get(
      `/export/predictions/annual/${year}/excel?${params.toString()}`,
      { responseType: "blob" }
    );
  },
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get("/profile/me"),
  updateProfile: (data) => api.patch("/profile/update", data),
  changePassword: (data) => api.post("/profile/change-password", data),
};

// Report API
export const reportsAPI = {
  downloadPredictionPDF: (predictionId) =>
    api.get(`/reports/prediction/${predictionId}/pdf`, {
      responseType: "blob",
    }),
  downloadAnnualPDF: (year, latitude, longitude) => {
    const params = new URLSearchParams({ year });
    if (latitude) params.append("latitude", latitude);
    if (longitude) params.append("longitude", longitude);
    return api.get(
      `/reports/prediction/annual/${year}/pdf?${params.toString()}`,
      {
        responseType: "blob",
      }
    );
  },
};

export default api;
