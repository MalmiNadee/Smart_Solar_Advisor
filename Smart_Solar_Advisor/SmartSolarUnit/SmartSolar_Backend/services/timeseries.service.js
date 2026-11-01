import dotenv from 'dotenv';
dotenv.config();

const PYTHON_ML_ENGINE_URL = process.env.PYTHON_ML_ENGINE_URL;

export async function getTimeSeriesForecast(dailyData, periods = 30, useSarima = false) {
  try {
    const validData = dailyData.filter((d) => d.readingsCount > 0 || d.totalKwh > 0);
    const body = {
      daily_data: validData.map((d) => ({
        date: d.date,
        value: d.totalKwh,
        totalKwh: d.totalKwh,
      })),
      periods,
      model: useSarima ? 'sarima' : 'prophet',
    };
    const response = await fetch(`${PYTHON_ML_ENGINE_URL}/api/timeseries/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Python engine: ${response.status} ${text}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Time-series forecast error:', error);
    return {
      error: true,
      message: error.message || 'Time-series forecast unavailable. Is the Python engine running?',
      forecast: [],
      history: dailyData,
    };
  }
}
