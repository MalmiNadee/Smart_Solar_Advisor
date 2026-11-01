import { useState, useEffect, useRef } from "react";
import { sitesAPI, sensorsAPI, predictionsAPI, weatherAPI, explainabilityAPI } from "@/lib/api";
import { SensorData, PredictionData, SolarSite, WeatherSeasonal, PredictionMonthlyBreakdownItem } from "@/types/solar";

// Hook for all solar sites with realtime polling
export const useSolarSites = (pollInterval: number = 5000) => {
  const [sites, setSites] = useState<SolarSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSites = async () => {
    try {
      const data = await sitesAPI.getAll();
      setSites(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sites");
      console.error("Error fetching sites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSites, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);

  return { sites, loading, error };
};

// Hook for single solar site with realtime polling
export const useSolarSite = (siteId: string | null, pollInterval: number = 5000) => {
  const [site, setSite] = useState<SolarSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSite = async () => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    try {
      const data = await sitesAPI.getById(siteId);
      setSite(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch site");
      console.error("Error fetching site:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      setLoading(false);
      return;
    }

    fetchSite();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSite, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [siteId, pollInterval]);

  return { site, loading, error };
};

// Hook for real-time sensor data with polling
export const useSensorData = (deviceId: string | null, pollInterval: number = 5000) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSensorData = async () => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    try {
      const readings = await sensorsAPI.getRecent(deviceId, 50);
      // Transform API response to match SensorData format
      const formattedData: SensorData[] = readings.map((reading: any) => ({
        timestamp: reading.timestamp,
        ...reading,
      }));
      
      setData(formattedData.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sensor data");
      console.error("Error fetching sensor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deviceId) {
      setData([]);
      setLoading(false);
      return;
    }

    fetchSensorData();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSensorData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [deviceId, pollInterval]);

  return { data, loading, error };
};

// Hook for real-time prediction data with polling
export const usePredictionData = (
  customerName: string | null,
  siteId: string | null,
  pollInterval: number = 10000 // Poll predictions less frequently
) => {
  const [data, setData] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPredictionData = async () => {
    if (!customerName || !siteId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch summary which includes daily, monthly, and latest
      const summary = await predictionsAPI.getSummary(customerName, siteId);
      
      // Fetch recent predictions for chart data
      const allPredictions = await predictionsAPI.getAll(customerName, siteId);
      
      // Transform API response
      const formattedData: PredictionData[] = allPredictions
        .slice(-288) // Last 24 hours at 5-min intervals
        .map((pred: any) => ({
          timestamp: pred.timestamp,
          predicted_kwh_5min: pred.predicted_kwh_5min || 0,
          interval: pred.interval || "5min",
          unit: pred.unit || "kWh",
          device_id: pred.device_id || "",
          panel_area_m2: pred.panel_area_m2 || 0,
          features_used: pred.features_used || [],
        }));

      setData(formattedData);
      setDailyTotal(summary.daily?.totalKwh || 0);
      setMonthlyTotal(summary.monthly?.totalKwh || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch prediction data");
      console.error("Error fetching prediction data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerName || !siteId) {
      setData([]);
      setDailyTotal(0);
      setMonthlyTotal(0);
      setLoading(false);
      return;
    }

    fetchPredictionData();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchPredictionData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [customerName, siteId, pollInterval]);

  return { data, dailyTotal, monthlyTotal, loading, error };
};

// Hook for weather seasonal trends (last 12 months temperature/precipitation by month)
export const useWeatherSeasonal = (
  lat: number | null | undefined,
  lon: number | null | undefined,
  pollInterval: number = 300000 // 5 min
) => {
  const [data, setData] = useState<WeatherSeasonal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSeasonal = async () => {
    try {
      const result = await weatherAPI.getSeasonal(lat ?? undefined, lon ?? undefined);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch seasonal weather");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasonal();
    intervalRef.current = setInterval(fetchSeasonal, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lat, lon, pollInterval]);

  return { data, loading, error };
};

// Hook for prediction monthly breakdown (last 12 months kWh per month)
export const usePredictionMonthlyBreakdown = (
  customerName: string | null,
  siteId: string | null
) => {
  const [data, setData] = useState<PredictionMonthlyBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    predictionsAPI
      .getMonthlyBreakdown(customerName, siteId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to fetch monthly breakdown");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerName, siteId]);

  return { data, loading, error };
};

// Hook for all low prediction dates with explanations (for Analyze page)
export const useLowPredictionDates = (
  customerName: string | null,
  siteId: string | null,
  days: number = 30,
  threshold?: number
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    explainabilityAPI
      .getLowPredictionDates(customerName, siteId, days, threshold)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to fetch low prediction dates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerName, siteId, days, threshold]);

  return { data, loading, error };
};

// Hook for daily analysis (realtime collected results)
export const useDailyAnalysis = (
  customerName: string | null,
  siteId: string | null,
  date?: string,
  includeXai: boolean = false,
  pollInterval: number = 10000
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDailyAnalysis = async () => {
    if (!customerName || !siteId) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const result = await explainabilityAPI.getDailyAnalysis(customerName, siteId, date, includeXai);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch daily analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyAnalysis();
    intervalRef.current = setInterval(fetchDailyAnalysis, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [customerName, siteId, date, includeXai, pollInterval]);

  return { data, loading, error, refetch: fetchDailyAnalysis };
};

// Hook for time-series forecast (Prophet/SARIMA)
export const useTimeSeriesForecast = (
  customerName: string | null,
  siteId: string | null,
  days: number = 90,
  periods: number = 30,
  model: "prophet" | "sarima" = "prophet"
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      if (!customerName || !siteId) {
        setData(null);
        setLoading(false);
        return;
      }
      const res = await explainabilityAPI.getTimeSeriesForecast(
        customerName,
        siteId,
        days,
        periods,
        model
      );
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch time-series forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!customerName || !siteId) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await explainabilityAPI.getTimeSeriesForecast(
          customerName,
          siteId,
          days,
          periods,
          model
        );
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to fetch time-series forecast");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [customerName, siteId, days, periods, model]);

  return { data, loading, error, refetch: fetchForecast };
};

// Hook for full year forecast (12 months ahead)
export const useFullYearForecast = (
  customerName: string | null,
  siteId: string | null,
  lat?: number | null,
  lon?: number | null
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    weatherAPI
      .getFullYearForecast(customerName, siteId, lat ?? undefined, lon ?? undefined)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to fetch full year forecast");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerName, siteId, lat, lon]);

  return { data, loading, error };
};

// Hook for low prediction explanation
export const useLowPredictionExplanation = (
  customerName: string | null,
  siteId: string | null,
  date?: string,
  threshold?: number
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    explainabilityAPI
      .explainLow(customerName, siteId, date, threshold)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to fetch explanation");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerName, siteId, date, threshold]);

  return { data, loading, error, refetch: () => {
    setLoading(true);
    explainabilityAPI.explainLow(customerName!, siteId!, date, threshold)
      .then(setData)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }};
};

// Hook for feature importance
export const useFeatureImportance = (
  customerName: string | null,
  siteId: string | null
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    explainabilityAPI
      .getFeatureImportance(customerName, siteId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to fetch feature importance");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerName, siteId]);

  return { data, loading, error };
};

