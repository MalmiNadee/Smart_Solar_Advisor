/**
 * Seasonal Forecast Service
 * Provides full-year (12 months) forecast using historical patterns and weather data
 */

import * as weatherService from './weather.service.js';
import PredictionModel from '../models/prediction.model.js';
import SiteModel from '../models/site.model.js';

const DEFAULT_LAT = parseFloat(process.env.DEFAULT_WEATHER_LAT || '6.9271');
const DEFAULT_LON = parseFloat(process.env.DEFAULT_WEATHER_LON || '79.8612');

/**
 * Calculate seasonal adjustment factor based on temperature and precipitation
 */
function calculateSeasonalFactor(avgTemp, precipitation, historicalAvg) {
  let factor = 1.0;
  
  // Temperature impact: optimal around 25°C, efficiency drops above
  if (avgTemp > 25) {
    const tempPenalty = (avgTemp - 25) * 0.01; // 1% per degree above 25°C
    factor *= (1 - Math.min(tempPenalty, 0.15)); // Max 15% reduction
  }
  
  // Precipitation impact: reduces solar irradiance
  if (precipitation > 0) {
    const precipPenalty = Math.min(precipitation / 100, 0.3); // Up to 30% reduction
    factor *= (1 - precipPenalty);
  }
  
  return Math.max(factor, 0.3); // Minimum 30% of baseline
}

/**
 * Get full year forecast (12 months ahead)
 */
export async function getFullYearForecast(customerName, siteId, lat, lon) {
  // Get site info for system capacity
  const site = await SiteModel.getById(siteId);
  const systemCapacity = site?.system_kw || 0;
  
  // Get historical monthly breakdown for baseline
  const historicalBreakdown = await PredictionModel.getLast12MonthsBreakdown(customerName, siteId);
  const historicalAvg = historicalBreakdown.length > 0
    ? historicalBreakdown.reduce((sum, m) => sum + m.totalKwh, 0) / historicalBreakdown.length
    : 0;
  
  // Get historical weather patterns (last 12 months)
  const historicalWeather = await weatherService.getSeasonalTrends(lat, lon);
  
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Build forecast for next 12 months
  const forecast = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < 12; i++) {
    const forecastMonth = (currentMonth + i) % 12 || 12;
    const forecastYear = currentYear + Math.floor((currentMonth + i - 1) / 12);
    const yearMonth = `${forecastYear}-${String(forecastMonth).padStart(2, '0')}`;
    
    // Find historical pattern for this month (from previous year)
    const historicalMonth = historicalWeather.monthly.find(
      m => m.month === forecastMonth
    );
    
    // Use historical average if available, otherwise use site average
    const baselineKwh = historicalMonth
      ? historicalAvg * (historicalMonth.avgTemperature ? 1.0 : 0.9) // Adjust if no temp data
      : historicalAvg;
    
    // Get forecasted weather for this month (use historical pattern for now)
    // In production, you could use extended weather forecast APIs
    const forecastedTemp = historicalMonth?.avgTemperature ?? 28;
    const forecastedPrecip = historicalMonth?.precipitationSum ?? 50;
    
    // Calculate seasonal adjustment
    const adjustmentFactor = calculateSeasonalFactor(forecastedTemp, forecastedPrecip, historicalAvg);
    
    // Predict solar yield for this month
    const predictedKwh = baselineKwh * adjustmentFactor;
    
    // Confidence based on data availability
    const confidence = historicalMonth && historicalBreakdown.some(m => m.month === forecastMonth)
      ? 'high'
      : historicalMonth
      ? 'medium'
      : 'low';
    
    forecast.push({
      yearMonth,
      monthName: monthNames[forecastMonth - 1],
      year: forecastYear,
      month: forecastMonth,
      avgTemperature: forecastedTemp,
      precipitationSum: Math.round(forecastedPrecip * 10) / 10,
      predictedSolarKwh: Math.round(predictedKwh * 100) / 100,
      baselineKwh: Math.round(baselineKwh * 100) / 100,
      adjustmentFactor: Math.round(adjustmentFactor * 1000) / 1000,
      confidence,
    });
  }
  
  return {
    latitude: lat != null ? parseFloat(lat) : DEFAULT_LAT,
    longitude: lon != null ? parseFloat(lon) : DEFAULT_LON,
    systemCapacity,
    historicalAverage: Math.round(historicalAvg * 100) / 100,
    forecast,
  };
}

/**
 * Get monthly adjusted prediction with seasonal trends
 */
export async function getMonthlyAdjusted(customerName, siteId, yearMonth, lat, lon) {
  // Get base monthly total
  const baseTotal = await PredictionModel.getMonthlyTotal(customerName, siteId, yearMonth);
  
  // Get historical weather for this month
  const historicalWeather = await weatherService.getSeasonalTrends(lat, lon);
  const [year, month] = yearMonth.match(/(\d{4})(\d{2})/).slice(1).map(Number);
  const historicalMonth = historicalWeather.monthly.find(
    m => m.year === year && m.month === month
  );
  
  if (!historicalMonth) {
    return {
      ...baseTotal,
      adjusted: false,
      adjustmentFactor: 1.0,
    };
  }
  
  // Calculate adjustment
  const adjustmentFactor = calculateSeasonalFactor(
    historicalMonth.avgTemperature,
    historicalMonth.precipitationSum,
    baseTotal.totalKwh
  );
  
  const adjustedKwh = baseTotal.totalKwh * adjustmentFactor;
  
  return {
    ...baseTotal,
    adjusted: true,
    adjustmentFactor: Math.round(adjustmentFactor * 1000) / 1000,
    adjustedKwh: Math.round(adjustedKwh * 100) / 100,
    weatherFactors: {
      avgTemperature: historicalMonth.avgTemperature,
      precipitationSum: historicalMonth.precipitationSum,
    },
  };
}
