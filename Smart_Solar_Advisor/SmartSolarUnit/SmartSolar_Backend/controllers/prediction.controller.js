// prediction.controller.js  (fixed - TypeScript annotations removed)

import PredictionModel from '../models/prediction.model.js';

export const getAll = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const predictions = await PredictionModel.getPredictions(customerName, siteId);

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions'
    });
  }
};

export const getLatest = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const prediction = await PredictionModel.getLatestPrediction(customerName, siteId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'No predictions found'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Get latest prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction'
    });
  }
};

export const getByRange = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const predictions = await PredictionModel.getPredictionsInRange(
      customerName,
      siteId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Get predictions by range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions'
    });
  }
};

export const getDailyTotal = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    let { date } = req.query;

    if (!date) {
      // Default to today
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const result = await PredictionModel.getDailyTotal(customerName, siteId, today);
      return res.json({
        success: true,
        data: result
      });
    }

    const result = await PredictionModel.getDailyTotal(customerName, siteId, date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get daily total error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate daily total'
    });
  }
};

export const getMonthlyTotal = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    let { yearMonth } = req.query;

    if (!yearMonth) {
      // Default to current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const result = await PredictionModel.getMonthlyTotal(customerName, siteId, currentMonth);
      return res.json({
        success: true,
        data: result
      });
    }

    const result = await PredictionModel.getMonthlyTotal(customerName, siteId, yearMonth);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get monthly total error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate monthly total'
    });
  }
};

export const getMonthlyBreakdown = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const breakdown = await PredictionModel.getLast12MonthsBreakdown(customerName, siteId);
    res.json({
      success: true,
      data: breakdown,
      count: breakdown.length
    });
  } catch (error) {
    console.error('Get monthly breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly breakdown'
    });
  }
};

export const getSummary = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');

    const [dailyTotal, monthlyTotal, latestPrediction] = await Promise.all([
      PredictionModel.getDailyTotal(customerName, siteId, todayStr),
      PredictionModel.getLast30DaysTotal(customerName, siteId),
      PredictionModel.getLatestPrediction(customerName, siteId)
    ]);

    res.json({
      success: true,
      data: {
        daily: dailyTotal,
        monthly: monthlyTotal,
        latest: latestPrediction
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary'
    });
  }
};

export const explainLowPrediction = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { date, threshold } = req.query;
    const explanationService = await import('../services/explanation.service.js');
    const data = await explanationService.explainLowPrediction(
      customerName,
      siteId,
      date,
      threshold ? parseFloat(threshold) : undefined
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Explain low prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to explain low prediction'
    });
  }
};

export const getMonthlyAdjusted = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { yearMonth, lat, lon } = req.query;

    if (!yearMonth) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const seasonalForecastService = await import('../services/seasonal_forecast.service.js');
      const site = await import('../models/site.model.js').then(m => m.default.getById(siteId));
      const data = await seasonalForecastService.getMonthlyAdjusted(
        customerName,
        siteId,
        currentMonth,
        lat || site?.latitude,
        lon || site?.longitude
      );
      return res.json({ success: true, data });
    }

    const seasonalForecastService = await import('../services/seasonal_forecast.service.js');
    const site = await import('../models/site.model.js').then(m => m.default.getById(siteId));
    const data = await seasonalForecastService.getMonthlyAdjusted(
      customerName,
      siteId,
      yearMonth,
      lat || site?.latitude,
      lon || site?.longitude
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get monthly adjusted error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get monthly adjusted prediction'
    });
  }
};

export const getFeatureImportance = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const explanationService = await import('../services/explanation.service.js');
    const data = await explanationService.getFeatureImportance(customerName, siteId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get feature importance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get feature importance'
    });
  }
};

export const getShapExplanation = async (req, res) => {
  try {
    const { customerName, siteId, timestamp } = req.params;
    const xaiService = await import('../services/xai.service.js');
    const data = await xaiService.getShapExplanation(customerName, siteId, timestamp);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get SHAP explanation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SHAP explanation'
    });
  }
};

export const getLimeExplanation = async (req, res) => {
  try {
    const { customerName, siteId, timestamp } = req.params;
    const xaiService = await import('../services/xai.service.js');
    const data = await xaiService.getLimeExplanation(customerName, siteId, timestamp);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get LIME explanation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get LIME explanation'
    });
  }
};

export const getLowPredictionDates = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { days, threshold } = req.query;
    const explanationService = await import('../services/explanation.service.js');
    const data = await explanationService.getLowPredictionDates(
      customerName,
      siteId,
      days ? parseInt(days, 10) : 30,
      threshold ? parseFloat(threshold) : undefined
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get low prediction dates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get low prediction dates'
    });
  }
};

export const getGlobalXaiSummary = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { days, threshold } = req.query;

    let daysToAnalyze;

    const SiteModel = (await import('../models/site.model.js')).default;
    const site = await SiteModel.getById(siteId);
    if (site?.created_at) {
      const start = new Date(site.created_at);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      daysToAnalyze = Math.min(30, Math.max(1, diffDays));
    } else if (days) {
      daysToAnalyze = Math.max(1, parseInt(days, 10));
    } else {
      daysToAnalyze = 30;
    }

    const explanationService = await import('../services/explanation.service.js');
    const data = await explanationService.getGlobalXaiSummary(
      customerName,
      siteId,
      daysToAnalyze,
      threshold ? parseFloat(threshold) : undefined
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get global XAI summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get global XAI summary',
    });
  }
};

export const getDailyAnalysis = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { date, includeXai } = req.query;

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const dateStr = targetDate.replace(/-/g, '');
    const [dailyTotal, latestPrediction] = await Promise.all([
      PredictionModel.getDailyTotal(customerName, siteId, dateStr),
      PredictionModel.getLatestPrediction(customerName, siteId),
    ]);

    let xaiExplanation = null;
    if (includeXai === 'true' && latestPrediction?.features_used) {
      const xaiService = await import('../services/xai.service.js');
      xaiExplanation = await xaiService.getShapExplanation(
        customerName,
        siteId,
        latestPrediction.timestamp,
        latestPrediction.features_used
      );
    }
    res.json({
      success: true,
      data: {
        date: targetDate,
        dateStr,
        totalKwh: dailyTotal.totalKwh,
        readingsCount: dailyTotal.readingsCount,
        latestPrediction: latestPrediction ? {
          timestamp: latestPrediction.timestamp,
          predictedKwh: latestPrediction.predicted_kwh_5min,
          features: latestPrediction.features_used,
        } : null,
        xaiExplanation,
      },
    });
  } catch (error) {
    console.error('Get daily analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get daily analysis',
    });
  }
};

export const getTimeSeriesForecast = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { days, periods, model } = req.query;
    const historyDays = days ? parseInt(days, 10) : 90;
    const forecastPeriods = periods ? parseInt(periods, 10) : 30;
    const useSarima = model === 'sarima';
    const dailyTotals = await PredictionModel.getDailyTotalsForRange(customerName, siteId, historyDays);
    const timeseriesService = await import('../services/timeseries.service.js');
    const forecast = await timeseriesService.getTimeSeriesForecast(dailyTotals, forecastPeriods, useSarima);
    res.json({
      success: true,
      data: {
        history: dailyTotals,
        forecast: forecast.forecast || [],
        historyData: forecast.history || [],
        model: forecast.model || (useSarima ? 'sarima' : 'prophet'),
        error: forecast.error || false,
        message: forecast.message,
      },
    });
  } catch (error) {
    console.error('Get time-series forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get time-series forecast',
    });
  }
};