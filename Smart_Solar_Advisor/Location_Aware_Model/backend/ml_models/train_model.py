import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import joblib
import os

class HybridSolarModel:
    def __init__(self):
        self.knn_model = None
        self.xgb_model = None
        self.scaler = StandardScaler()
        self.feature_columns = [
            'latitude', 'longitude', 'year', 'month',
            'allsky_sfc_sw_dwn', 'rh2m', 't2m', 'ws2m',
            'tilt_deg', 'azimuth_deg', 'installed_capacity_kw',
            'panel_efficiency', 'system_loss', 'shading_factor'
        ]
    
    def generate_synthetic_features(self, df):
        """Generate rooftop parameters when missing"""
        np.random.seed(42)
        n = len(df)
        
        if 'tilt_deg' not in df.columns:
            df['tilt_deg'] = df['latitude'].apply(lambda x: min(max(abs(x) + np.random.uniform(-5, 5), 0), 60))
        
        if 'azimuth_deg' not in df.columns:
            df['azimuth_deg'] = df['latitude'].apply(lambda x: 180 if x > 0 else 0)
        
        if 'installed_capacity_kw' not in df.columns:
            df['installed_capacity_kw'] = np.random.uniform(3, 10, n)
        
        if 'panel_efficiency' not in df.columns:
            df['panel_efficiency'] = np.random.uniform(0.15, 0.22, n)
        
        if 'system_loss' not in df.columns:
            df['system_loss'] = np.random.uniform(0.10, 0.20, n)
        
        if 'shading_factor' not in df.columns:
            df['shading_factor'] = np.random.uniform(0.85, 1.0, n)
        
        return df
    
    def calculate_monthly_energy(self, row):
        """Physics-based monthly solar energy estimation"""
        days_in_month = 30.44
        if row['month'] in [1, 3, 5, 7, 8, 10, 12]:
            days_in_month = 31
        elif row['month'] in [4, 6, 9, 11]:
            days_in_month = 30
        elif row['month'] == 2:
            days_in_month = 28.25
        
        # Panel area (m²)
        panel_area = row['installed_capacity_kw'] / (row['panel_efficiency'] * 1.0)
        
        # Performance ratio
        pr = (1 - row['system_loss']) * row['shading_factor']

        tilt_factor = 1 - abs(row['tilt_deg'] - abs(row['latitude'])) * 0.005
        tilt_factor = max(0.7, min(1.0, tilt_factor))
        
        # Azimuth factor
        optimal_azimuth = 180 if row['latitude'] > 0 else 0
        azimuth_diff = abs(row['azimuth_deg'] - optimal_azimuth)
        azimuth_factor = 1 - (azimuth_diff / 180) * 0.3
        azimuth_factor = max(0.7, min(1.0, azimuth_factor))
        
        # Monthly energy (kWh)
        monthly_energy = (
            panel_area * 
            row['panel_efficiency'] * 
            row['allsky_sfc_sw_dwn'] * 
            days_in_month * 
            pr * 
            tilt_factor * 
            azimuth_factor
        )
        
        return max(0, monthly_energy)
    
    def prepare_data(self, csv_path):
      """Load and prepare training data"""
      df = pd.read_csv(csv_path)

      df.columns = df.columns.str.strip().str.lower()

      df.rename(columns={
        'lat': 'latitude',
        'lon': 'longitude',
        'year': 'year',
        't2m': 't2m',
        'rh2m': 'rh2m',
        'ws2m': 'ws2m',
        'allsky_sfc_sw_dwn': 'allsky_sfc_sw_dwn'
      }, inplace=True)

      if 'month' not in df.columns:
        df['month'] = 1
    
      df = self.generate_synthetic_features(df)

      df['monthly_energy_kwh'] = df.apply(self.calculate_monthly_energy, axis=1)
    
      # Remove invalid rows
      df = df.dropna()
      df = df[df['monthly_energy_kwh'] > 0]
    
      return df


    def train(self, csv_path, test_size=0.2):
        """Train hybrid KNN + XGBoost model"""

        print("Loading and preparing data...")
        df = self.prepare_data(csv_path)
        
        X = df[self.feature_columns]
        y = df['monthly_energy_kwh']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train KNN model for location-aware similarity
        print("Training KNN model...")
        self.knn_model = KNeighborsRegressor(
            n_neighbors=5,
            weights='distance',
            metric='euclidean'
        )
        self.knn_model.fit(X_train_scaled, y_train)
        knn_pred = self.knn_model.predict(X_test_scaled)
        
        # Train XGBoost model
        print("Training XGBoost model...")
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=6,
            min_child_weight=3,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective='reg:squarederror'
        )
        self.xgb_model.fit(X_train_scaled, y_train)
        xgb_pred = self.xgb_model.predict(X_test_scaled)
        
        # Hybrid prediction (weighted average)
        hybrid_pred = 0.3 * knn_pred + 0.7 * xgb_pred
        
        # Calculate metrics
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        mae = mean_absolute_error(y_test, hybrid_pred)
        rmse = np.sqrt(mean_squared_error(y_test, hybrid_pred))
        r2 = r2_score(y_test, hybrid_pred)
        
        print(f"\nModel Performance:")
        print(f"MAE: {mae:.2f} kWh")
        print(f"RMSE: {rmse:.2f} kWh")
        print(f"R² Score: {r2:.4f}")
        
        # Save models
        self.save_models()
        
        return {
            'mae': mae,
            'rmse': rmse,
            'r2_score': r2,
            'n_samples': len(df)
        }
    
    def save_models(self):
        """Save trained models"""
        os.makedirs('ml_models/saved', exist_ok=True)
        joblib.dump(self.knn_model, 'ml_models/saved/knn_model.pkl')
        joblib.dump(self.xgb_model, 'ml_models/saved/xgb_model.pkl')
        joblib.dump(self.scaler, 'ml_models/saved/scaler.pkl')
        print("Models saved successfully!")
    
    def load_models(self):
        """Load trained models"""
        try:
            self.knn_model = joblib.load('ml_models/saved/knn_model.pkl')
            self.xgb_model = joblib.load('ml_models/saved/xgb_model.pkl')
            self.scaler = joblib.load('ml_models/saved/scaler.pkl')
            print("Models loaded successfully!")
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False

if __name__ == '__main__':
    model = HybridSolarModel()
    metrics = model.train('../backend/data/solar_data.csv')
    print("\nTraining completed!")