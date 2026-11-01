from .user import db
from datetime import datetime

class Prediction(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Input parameters
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    tilt_deg = db.Column(db.Float, nullable=False)
    azimuth_deg = db.Column(db.Float, nullable=False)
    installed_capacity_kw = db.Column(db.Float, nullable=False)
    panel_efficiency = db.Column(db.Float, nullable=False)
    system_loss = db.Column(db.Float, nullable=False)
    shading_factor = db.Column(db.Float, nullable=False)
    
    # Predicted output
    predicted_energy_kwh = db.Column(db.Float, nullable=False)
    confidence_score = db.Column(db.Float)
    
    # Financial calculations
    estimated_cost_usd = db.Column(db.Float)
    monthly_savings_usd = db.Column(db.Float)
    annual_savings_usd = db.Column(db.Float)
    roi_percentage = db.Column(db.Float)
    payback_period_years = db.Column(db.Float)
    
    # Scenario simulation
    scenario_name = db.Column(db.String(100))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'year': self.year,
            'month': self.month,
            'tilt_deg': self.tilt_deg,
            'azimuth_deg': self.azimuth_deg,
            'installed_capacity_kw': self.installed_capacity_kw,
            'panel_efficiency': self.panel_efficiency,
            'system_loss': self.system_loss,
            'shading_factor': self.shading_factor,
            'predicted_energy_kwh': self.predicted_energy_kwh,
            'confidence_score': self.confidence_score,
            'estimated_cost_usd': self.estimated_cost_usd,
            'monthly_savings_usd': self.monthly_savings_usd,
            'annual_savings_usd': self.annual_savings_usd,
            'roi_percentage': self.roi_percentage,
            'payback_period_years': self.payback_period_years,
            'scenario_name': self.scenario_name,
            'username': self.user.username if self.user else f"User {self.user_id}",
            'created_at': self.created_at.isoformat()
        }