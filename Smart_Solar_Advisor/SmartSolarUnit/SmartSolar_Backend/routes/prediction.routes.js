import { Router } from 'express';

import {
  getSummary,
  getDailyTotal,
  getMonthlyTotal,
  getAll,
  getLatest,
  getByRange,
  getMonthlyBreakdown,
  explainLowPrediction,
  getMonthlyAdjusted,
  getFeatureImportance,
  getShapExplanation,
  getLimeExplanation,
  getLowPredictionDates,
  getDailyAnalysis,
  getTimeSeriesForecast,
  getGlobalXaiSummary,
} from '../controllers/prediction.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Get prediction summary (daily + monthly + latest)
router.get('/:customerName/:siteId/summary', verifyToken, getSummary);

// Get daily total
router.get('/:customerName/:siteId/daily', verifyToken, getDailyTotal);

// Get monthly total
router.get('/:customerName/:siteId/monthly', verifyToken, getMonthlyTotal);

// Get monthly adjusted with seasonal trends
router.get('/:customerName/:siteId/monthly-adjusted', verifyToken, getMonthlyAdjusted);

// Get last 12 months breakdown (for seasonal trends)
router.get('/:customerName/:siteId/monthly-breakdown', verifyToken, getMonthlyBreakdown);

// Explain low prediction
router.get('/:customerName/:siteId/explain-low', verifyToken, explainLowPrediction);

// Get all low prediction dates with explanations (for Analyze page)
router.get('/:customerName/:siteId/low-prediction-dates', verifyToken, getLowPredictionDates);

// Get daily analysis (realtime collected results)
router.get('/:customerName/:siteId/daily-analysis', verifyToken, getDailyAnalysis);

// Get time-series forecast (Prophet/SARIMA)
router.get('/:customerName/:siteId/timeseries-forecast', verifyToken, getTimeSeriesForecast);

// Get global XAI text summary across all collected data
router.get('/:customerName/:siteId/xai-summary', verifyToken, getGlobalXaiSummary);

// Get feature importance
router.get('/:customerName/:siteId/feature-importance', verifyToken, getFeatureImportance);

// Get SHAP explanation for specific prediction
router.get('/:customerName/:siteId/explain/:timestamp', verifyToken, getShapExplanation);

// Get LIME explanation for specific prediction
router.get('/:customerName/:siteId/explain-lime/:timestamp', verifyToken, getLimeExplanation);

// Get all predictions for a site
router.get('/:customerName/:siteId', verifyToken, getAll);

// Get latest prediction
router.get('/:customerName/:siteId/latest', verifyToken, getLatest);

// Get predictions by date range
router.get('/:customerName/:siteId/range', verifyToken, getByRange);

export default router;     
