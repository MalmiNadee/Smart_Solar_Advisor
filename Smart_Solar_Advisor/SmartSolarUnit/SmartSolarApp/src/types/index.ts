export interface SolarSystem {
  id: string;
  siteName: string;
  systemCapacity: number;
  panelCount: number;
  inverterCapacity: number;
  status: 'running' | 'completed';
  lastUpdated: Date;
  deviceId?: string;
  customerName?: string;
  created_at?: string; // Site creation date (YYYY-MM-DD format)
  latitude?: number | null;
  longitude?: number | null;
}
  
export interface SensorData {
  timestamp: Date;
  irradiance: number;
  temperature: number;
  humidity: number;
  dustLevel: number;
  rainLevel: number;
}

export interface PredictionData {
  timestamp: Date;
  predictedEnergy: number;
}

export interface DailyData {
  date: string;
  totalEnergy: number;
  hourlyData: {
    hour: number;
    energy: number;
  }[];
}

export interface MonthlyData {
  month: string;
  totalEnergy: number;
  dailyData: {
    date: string;
    energy: number;
  }[];
}

export interface User {
  id: string;
  email: string;
  role: string;
  customerName?: string;
  assignedSites?: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}