import { useState, useEffect } from "react";
import { predictionsAPI } from "@/lib/api";

interface DailyTotal {
  date: string; // YYYYMMDD format
  totalKwh: number;
  readingsCount: number;
}

export const useDailyPredictions = (
  customerName: string | null,
  siteId: string | null,
  days: number = 30,
  startDate?: string | null // Optional start date (YYYY-MM-DD or YYYY/MM/DD format)
) => {
  const [dailyData, setDailyData] = useState<DailyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName || !siteId) {
      setLoading(false);
      return;
    }

    const fetchDailyData = async () => {
      try {
        setLoading(true);
        
        // Determine start date: use provided startDate or default to today
        let start: Date;
        if (startDate) {
          // Parse startDate (could be YYYY-MM-DD or YYYY/MM/DD)
          const normalizedDate = startDate.replace(/\//g, '-');
          start = new Date(normalizedDate + 'T00:00:00');
          
          // Validate the date
          if (isNaN(start.getTime())) {
            console.warn('Invalid start date, using today:', startDate);
            start = new Date();
            start.setHours(0, 0, 0, 0);
          }
        } else {
          // Default to today
          start = new Date();
          start.setHours(0, 0, 0, 0);
        }
        
        const promises: Promise<DailyTotal>[] = [];

        // Fetch daily totals for N days starting from start date
        for (let i = 0; i < days; i++) {
          const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
          
          promises.push(
            predictionsAPI.getDailyTotal(customerName, siteId, dateStr)
          );
        }

        const results = await Promise.all(promises);
        setDailyData(results);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch daily predictions");
        console.error("Error fetching daily predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyData();
  }, [customerName, siteId, days, startDate]);

  return { dailyData, loading, error };
};

