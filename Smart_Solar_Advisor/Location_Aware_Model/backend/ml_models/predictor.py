import numpy as np
import pandas as pd
from .train_model import HybridSolarModel

class SolarPredictor:
    def __init__(self):
        self.model = HybridSolarModel()
        self.model.load_models()
    
    def predict(self, input_data):
        """
        Return hybrid prediction and confidence score
        """
        try:
            # Create feature array
            features = pd.DataFrame([input_data])
            features = features[self.model.feature_columns]
            
            # Scale features
            features_scaled = self.model.scaler.transform(features)
            
            # Model Predictions
            knn_pred = self.model.knn_model.predict(features_scaled)[0]
            xgb_pred = self.model.xgb_model.predict(features_scaled)[0]
            
            # Weighted hybrid prediction
            hybrid_pred = 0.3 * knn_pred + 0.7 * xgb_pred
            
            # Calculate confidence score (based on agreement between models)
            agreement = 1 - abs(knn_pred - xgb_pred) / max(knn_pred, xgb_pred, 1)
            confidence = min(0.99, max(0.5, agreement))
            
            return {
                'predicted_energy_kwh': float(hybrid_pred),
                'confidence_score': float(confidence),
                'knn_prediction': float(knn_pred),
                'xgb_prediction': float(xgb_pred)
            }
        
        except Exception as e:
            raise Exception(f"Prediction error: {str(e)}")
    
    def predict_annual(self, input_data):
        """Predict monthly and annual energy output"""
        predictions = []
        total_energy = 0
        
        for month in range(1, 13):
            monthly_data = input_data.copy()
            monthly_data['month'] = month
            
            result = self.predict(monthly_data)
            result['month'] = month
            predictions.append(result)
            total_energy += result['predicted_energy_kwh']
        
        return {
            'monthly_predictions': predictions,
            'total_annual_energy_kwh': total_energy,
            'average_confidence': np.mean([p['confidence_score'] for p in predictions])
        }