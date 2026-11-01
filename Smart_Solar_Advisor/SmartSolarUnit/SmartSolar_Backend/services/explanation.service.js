/**
 * Explanation Service
 * Provides explanations for low predictions and feature importance
 */

import PredictionModel from '../models/prediction.model.js';
import SiteModel from '../models/site.model.js';
import * as weatherService from './weather.service.js';

const LOW_PREDICTION_THRESHOLD = parseFloat(process.env.LOW_PREDICTION_THRESHOLD || '0.7');

/**
 * Analyze factors contributing to low prediction
 * Optionally uses a pre-computed average daily kWh for the comparison window.
 */
export async function explainLowPrediction(
  customerName,
  siteId,
  date,
  threshold = LOW_PREDICTION_THRESHOLD,
  avgOverrideKwh
) {
  // Get prediction for the date
  const dateStr = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dailyTotal = await PredictionModel.getDailyTotal(customerName, siteId, dateStr);

  // Get site info
  const site = await SiteModel.getById(siteId);

  // Calculate average daily generation.
  // If an override is provided (from a known window), use that value.
  // Otherwise, fall back to last 30 days with an estimate of days with data.
  let avgDailyKwh;
  if (typeof avgOverrideKwh === 'number' && avgOverrideKwh > 0) {
    avgDailyKwh = avgOverrideKwh;
  } else {
    const last30Days = await PredictionModel.getLast30DaysTotal(customerName, siteId);
    const readingsPerDay = 288; // 5‑minute intervals
    const estimatedDaysWithData = last30Days.readingsCount > 0
      ? Math.max(1, last30Days.readingsCount / readingsPerDay)
      : 1;
    avgDailyKwh = last30Days.readingsCount > 0
      ? last30Days.totalKwh / estimatedDaysWithData
      : dailyTotal.totalKwh;
  }

  const predictedKwh = dailyTotal.totalKwh;
  const percentage = avgDailyKwh > 0 ? (predictedKwh / avgDailyKwh) * 100 : 100;
  const isLow = percentage < (threshold * 100);

  if (!isLow) {
    return {
      isLow: false,
      predictedKwh,
      averageKwh: avgDailyKwh,
      percentage: Math.round(percentage * 10) / 10,
      message: 'Prediction is within normal range',
    };
  }

  // Get weather data for explanation
  const lat = site?.latitude;
  const lon = site?.longitude;
  let currentWeather = null;
  try {
    currentWeather = await weatherService.getCurrentWeather(lat, lon);
  } catch (error) {
    console.error('Failed to fetch weather for explanation:', error);
  }

  // Get recent predictions to analyze features
  const predictions = await PredictionModel.getPredictions(customerName, siteId);
  const recentPredictions = predictions
    .filter(p => {
      const predDate = p.timestamp?.slice(0, 8);
      return predDate === dateStr;
    })
    .slice(-10); // Last 10 predictions for the day

  // Analyze factors
  const factors = [];

  // Temperature analysis
  if (currentWeather?.temperature) {
    const temp = currentWeather.temperature;
    if (temp > 30) {
      factors.push({
        name: 'High Temperature',
        impact: 'high',
        value: Math.round(temp * 10) / 10,
        unit: '°C',
        explanation: `Temperature of ${temp.toFixed(1)}°C is above optimal range (25°C). Solar panel efficiency decreases by approximately ${Math.round((temp - 25) * 0.01 * 100)}% per degree above 25°C.`,
        contribution: Math.min((temp - 25) * 0.01, 0.15),
      });
    } else if (temp < 15) {
      factors.push({
        name: 'Low Temperature',
        impact: 'low',
        value: Math.round(temp * 10) / 10,
        unit: '°C',
        explanation: `Temperature of ${temp.toFixed(1)}°C may reduce panel efficiency slightly.`,
        contribution: 0.05,
      });
    }
  }

  // Cloud cover analysis
  if (currentWeather?.cloud_cover != null) {
    const cloudCover = currentWeather.cloud_cover;
    if (cloudCover > 70) {
      factors.push({
        name: 'High Cloud Cover',
        impact: 'high',
        value: Math.round(cloudCover),
        unit: '%',
        explanation: `Cloud cover of ${cloudCover}% significantly reduces solar irradiance. This is the primary factor limiting energy generation.`,
        contribution: cloudCover / 100 * 0.5, // Up to 50% reduction
      });
    } else if (cloudCover > 50) {
      factors.push({
        name: 'Moderate Cloud Cover',
        impact: 'medium',
        value: Math.round(cloudCover),
        unit: '%',
        explanation: `Cloud cover of ${cloudCover}% reduces available sunlight.`,
        contribution: cloudCover / 100 * 0.3,
      });
    }
  }

  // Precipitation analysis
  if (currentWeather?.precipitation != null && currentWeather.precipitation > 0) {
    factors.push({
      name: 'Precipitation',
      impact: 'high',
      value: Math.round(currentWeather.precipitation * 10) / 10,
      unit: 'mm',
      explanation: `Rainfall of ${currentWeather.precipitation.toFixed(1)}mm blocks sunlight and reduces energy generation.`,
      contribution: Math.min(currentWeather.precipitation / 10, 0.4), // Up to 40% reduction
    });
  }

  // Dust level analysis (from sensor data)
  const avgDust = recentPredictions.length > 0
    ? recentPredictions.reduce((sum, p) => {
      const dust = p.features_used?.dust_level || 0;
      return sum + dust;
    }, 0) / recentPredictions.length
    : null;

  if (avgDust != null && avgDust > 0.5) {
    factors.push({
      name: 'High Dust Level',
      impact: avgDust > 1.0 ? 'high' : 'medium',
      value: Math.round(avgDust * 100) / 100,
      unit: 'mg/m³',
      explanation: `Dust accumulation of ${avgDust.toFixed(2)} mg/m³ on panels reduces efficiency. Consider cleaning panels.`,
      contribution: Math.min(avgDust * 0.1, 0.15), // Up to 15% reduction
    });
  }

  // Irradiance analysis
  const avgIrradiance = recentPredictions.length > 0
    ? recentPredictions.reduce((sum, p) => {
      const irr = p.features_used?.irradiance || 0;
      return sum + irr;
    }, 0) / recentPredictions.length
    : null;

  if (avgIrradiance != null && avgIrradiance < 50000) {
    factors.push({
      name: 'Low Solar Irradiance',
      impact: 'high',
      value: Math.round(avgIrradiance),
      unit: 'lux',
      explanation: `Low irradiance of ${avgIrradiance.toFixed(0)} lux indicates insufficient sunlight. This directly limits energy generation.`,
      contribution: 0.3,
    });
  }

  // Humidity analysis (minor factor)
  if (currentWeather?.humidity != null && currentWeather.humidity > 80) {
    factors.push({
      name: 'High Humidity',
      impact: 'low',
      value: Math.round(currentWeather.humidity),
      unit: '%',
      explanation: `High humidity of ${currentWeather.humidity}% may slightly affect panel performance.`,
      contribution: 0.05,
    });
  }

  // Sort factors by impact
  factors.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });

  // Generate recommendations
  const recommendations = [];
  if (factors.some(f => f.name.includes('Dust'))) {
    recommendations.push('Consider cleaning solar panels to remove dust accumulation');
  }
  if (factors.some(f => f.name.includes('Cloud') || f.name.includes('Precipitation'))) {
    recommendations.push('Monitor weather forecast - conditions should improve');
  }
  if (factors.some(f => f.name.includes('Temperature'))) {
    recommendations.push('High temperatures reduce efficiency - this is normal during peak summer months');
  }
  if (factors.length === 0) {
    recommendations.push('Check for shading or obstructions blocking panels');
    recommendations.push('Verify system is operating normally');
  }

  return {
    isLow: true,
    predictedKwh: Math.round(predictedKwh * 1000) / 1000,
    averageKwh: Math.round(avgDailyKwh * 1000) / 1000,
    percentage: Math.round(percentage * 10) / 10,
    threshold: threshold * 100,
    factors,
    recommendations,
    date: dateStr,
  };
}

/**
 * Get feature importance (for SHAP/LIME integration)
 * This is a placeholder - actual SHAP/LIME would come from Python ML engine
 */
export async function getFeatureImportance(customerName, siteId) {
  // Get recent predictions to analyze feature patterns
  const predictions = await PredictionModel.getPredictions(customerName, siteId);
  const recent = predictions.slice(-100); // Last 100 predictions

  if (recent.length === 0) {
    return {
      features: [],
      message: 'Insufficient data for feature importance analysis',
    };
  }

  // Calculate correlation-based importance (simplified)
  // In production, this would use SHAP values from Python ML engine
  const features = ['irradiance', 'temperature', 'humidity', 'rainfall', 'dust_level'];
  const importance = {};

  features.forEach(feature => {
    const values = recent
      .map(p => p.features_used?.[feature])
      .filter(v => v != null);

    if (values.length === 0) {
      importance[feature] = 0;
      return;
    }

    // Simple variance-based importance (higher variance = more important)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    importance[feature] = Math.sqrt(variance);
  });

  // Normalize to 0-1 scale
  const maxImportance = Math.max(...Object.values(importance));
  const normalized = {};
  Object.keys(importance).forEach(key => {
    normalized[key] = maxImportance > 0 ? importance[key] / maxImportance : 0;
  });

  // Sort by importance
  const sorted = Object.entries(normalized)
    .map(([name, value]) => ({ name, importance: Math.round(value * 1000) / 1000 }))
    .sort((a, b) => b.importance - a.importance);

  return {
    features: sorted,
    method: 'variance-based (simplified)',
    note: 'For accurate SHAP values, use Python ML engine integration',
  };
}

/**
 * Get all dates with low predictions and their full text explanations (for Analyze page).
 * @param {string} customerName
 * @param {string} siteId
 * @param {number} days - number of days to look back (default 30)
 * @param {number} threshold - low threshold 0-1 (default from env)
 */
export async function getLowPredictionDates(customerName, siteId, days = 30, threshold = LOW_PREDICTION_THRESHOLD) {
  const latestPrediction = await PredictionModel.getLatestPrediction(customerName, siteId);
  let now = new Date();
  if (latestPrediction && latestPrediction.timestamp && latestPrediction.timestamp.length >= 8) {
    const ts = latestPrediction.timestamp;
    now = new Date(ts.substring(0, 4) + '-' + ts.substring(4, 6) + '-' + ts.substring(6, 8));
  }

  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    dates.push(dateStr);
  }

  // First compute daily totals for the requested window to get a true window average.
  let totalKwhSum = 0;
  let daysWithData = 0;
  const dailyTotalsByDate = {};

  for (const dateStr of dates) {
    const dailyTotal = await PredictionModel.getDailyTotal(customerName, siteId, dateStr);
    dailyTotalsByDate[dateStr] = dailyTotal;
    if (dailyTotal.readingsCount > 0) {
      totalKwhSum += dailyTotal.totalKwh;
      daysWithData += 1;
    }
  }

  const avgDailyKwh = daysWithData > 0 ? totalKwhSum / daysWithData : 0;

  const results = [];
  for (const dateStr of dates) {
    const dailyTotal = dailyTotalsByDate[dateStr];
    if (!dailyTotal || dailyTotal.readingsCount === 0) continue;

    const dateLabel = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

    // Reuse explainLowPrediction but force it to compare against this window's average.
    const explanation = await explainLowPrediction(
      customerName,
      siteId,
      dateLabel,
      threshold,
      avgDailyKwh
    );

    if (explanation.isLow) {
      const textSummary = buildExplanationText(explanation);
      results.push({
        date: dateLabel,
        dateStr,
        predictedKwh: explanation.predictedKwh,
        averageKwh: explanation.averageKwh,
        percentage: explanation.percentage,
        factors: explanation.factors,
        recommendations: explanation.recommendations,
        explanationText: textSummary,
      });
    }
  }

  return {
    averageDailyKwh: Math.round(avgDailyKwh * 1000) / 1000,
    threshold: threshold * 100,
    count: results.length,
    daysAnalyzed: days,
    lowPredictionDays: results.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

function buildExplanationText(explanation) {
  const lines = [];
  lines.push(`On this day, predicted generation was ${explanation.predictedKwh.toFixed(2)} kWh (${explanation.percentage}% of the ${explanation.averageKwh.toFixed(2)} kWh average).`);
  if (explanation.factors && explanation.factors.length > 0) {
    lines.push('Contributing factors:');
    explanation.factors.forEach(f => {
      lines.push(`• ${f.explanation}`);
    });
  }
  if (explanation.recommendations && explanation.recommendations.length > 0) {
    lines.push('Recommendations:');
    explanation.recommendations.forEach(r => lines.push(`• ${r}`));
  }
  return lines.join(' ');
}

/**
 * Build a global XAI text summary across many days of collected data.
 * Uses Firebase predictions + weather-based low-day explanations.
 */
export async function getGlobalXaiSummary(
  customerName,
  siteId,
  days = 30,
  threshold = LOW_PREDICTION_THRESHOLD
) {
  const lowData = await getLowPredictionDates(customerName, siteId, days, threshold);

  const { lowPredictionDays, averageDailyKwh, daysAnalyzed, threshold: thresholdPct } = lowData;

  if (!lowPredictionDays || lowPredictionDays.length === 0) {
    return {
      summaryText: `Across the last ${daysAnalyzed} day(s), average predicted daily energy was ` +
        `${averageDailyKwh.toFixed(2)} kWh. No days fell below the low threshold of ${thresholdPct.toFixed(
          1
        )}% of average. Generation has been within normal range for the analyzed period.`,
      daysAnalyzed,
      lowDaysCount: 0,
      factorsSummary: [],
      lowPredictionDays,
    };
  }

  // Aggregate factors across all low days
  const factorStats = {};
  lowPredictionDays.forEach((day) => {
    (day.factors || []).forEach((f) => {
      const key = f.name || "Unknown";
      if (!factorStats[key]) {
        factorStats[key] = {
          name: key,
          count: 0,
          impacts: new Set(),
        };
      }
      factorStats[key].count += 1;
      if (f.impact) {
        factorStats[key].impacts.add(f.impact);
      }
    });
  });

  const factorsSummary = Object.values(factorStats)
    .map((f) => ({
      name: f.name,
      count: f.count,
      impacts: Array.from(f.impacts),
    }))
    .sort((a, b) => b.count - a.count);

  const lines = [];
  lines.push(
    `Explainable AI summary for low generation days over the last ${daysAnalyzed} day(s).`
  );
  lines.push(
    `Average predicted daily energy across this period was ${averageDailyKwh.toFixed(
      2
    )} kWh. Days below ${thresholdPct.toFixed(
      1
    )}% of this average are treated as "low generation" days.`
  );
  lines.push(
    `The system detected ${lowPredictionDays.length} low generation day(s) driven by weather and environmental conditions.`
  );

  if (factorsSummary.length > 0) {
    lines.push("");
    lines.push("Main recurring reasons for low generation:");
    factorsSummary.forEach((f) => {
      lines.push(
        `• ${f.name} (appeared on ${f.count} low day(s), impact level(s): ${f.impacts.join(
          ", "
        )})`
      );
    });
  }

  lines.push("");
  lines.push("Day-by-day explanations:");
  lowPredictionDays.forEach((d) => {
    lines.push(`- ${d.date}: ${d.explanationText}`);
  });

  return {
    summaryText: lines.join("\n"),
    daysAnalyzed,
    lowDaysCount: lowPredictionDays.length,
    factorsSummary,
    lowPredictionDays,
  };
}
