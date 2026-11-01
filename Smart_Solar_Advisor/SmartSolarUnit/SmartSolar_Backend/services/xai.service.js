import dotenv from 'dotenv';
dotenv.config();

/**
 * XAI Service - Interface for Python ML Engine SHAP/LIME integration
 * This service communicates with the Python ML engine for explainability
 */

const PYTHON_ML_ENGINE_URL = process.env.PYTHON_ML_ENGINE_URL;
const ENABLE_SHAP = process.env.ENABLE_SHAP !== 'false';
const ENABLE_LIME = process.env.ENABLE_LIME !== 'false';

/**
 * Get SHAP explanation for a specific prediction.
 * Fetches prediction features from DB and sends to Python ML engine.
 */
export async function getShapExplanation(customerName, siteId, timestamp, featuresFromPrediction = null) {
  if (!ENABLE_SHAP) {
    throw new Error('SHAP explanations are disabled');
  }
  const PredictionModel = (await import('../models/prediction.model.js')).default;
  const features = featuresFromPrediction ?? await getPredictionFeatures(PredictionModel, customerName, siteId, timestamp);
  if (!features) {
    return { error: true, message: 'Prediction or features not found for this timestamp.', fallback: true };
  }
  try {
    const response = await fetch(
      `${PYTHON_ML_ENGINE_URL}/api/xai/shap`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      }
    );
    if (!response.ok) {
      throw new Error(`Python ML engine error: ${response.status}`);
    }
    const data = await response.json();
    return { ...data, timestamp };
  } catch (error) {
    console.error('SHAP explanation error:', error);
    return {
      error: true,
      message: 'SHAP explanation unavailable. Python ML engine may not be running.',
      fallback: true,
    };
  }
}

async function getPredictionFeatures(PredictionModel, customerName, siteId, timestamp) {
  const normalized = String(timestamp).replace(/-/g, '').replace(/:/g, '-');
  const predictions = await PredictionModel.getPredictions(customerName, siteId);
  const match = predictions.find((p) => {
    const key = String(p.timestamp || '').replace(/-/g, '').replace(/:/g, '-');
    return key === normalized || key === timestamp || p.timestamp === timestamp;
  });
  return match?.features_used ?? null;
}

/**
 * Get LIME explanation for a specific prediction.
 */
export async function getLimeExplanation(customerName, siteId, timestamp) {
  if (!ENABLE_LIME) {
    throw new Error('LIME explanations are disabled');
  }
  const PredictionModel = (await import('../models/prediction.model.js')).default;
  const features = await getPredictionFeatures(PredictionModel, customerName, siteId, timestamp);
  if (!features) {
    return { error: true, message: 'Prediction or features not found.', fallback: true };
  }
  try {
    const response = await fetch(
      `${PYTHON_ML_ENGINE_URL}/api/xai/lime`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      }
    );
    if (!response.ok) throw new Error(`Python ML engine error: ${response.status}`);
    const data = await response.json();
    return { ...data, timestamp };
  } catch (error) {
    console.error('LIME explanation error:', error);
    return {
      error: true,
      message: 'LIME explanation unavailable. Python ML engine may not be running.',
      fallback: true,
    };
  }
}

/**
 * Check if Python ML engine is available
 */
export async function checkPythonEngineHealth() {
  try {
    const response = await fetch(`${PYTHON_ML_ENGINE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
