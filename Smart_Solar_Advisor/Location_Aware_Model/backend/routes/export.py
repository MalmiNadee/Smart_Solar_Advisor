from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import db
from models.prediction import Prediction
from datetime import datetime
import csv
import io
from sqlalchemy import and_
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import calendar

export_bp = Blueprint('export', __name__)

@export_bp.route('/predictions/csv', methods=['GET'])
@jwt_required()
def export_predictions_csv():
    """
    Export user's predictions to CSV
    """
    try:
        user_id = get_jwt_identity()
        
        # Get all user predictions for user
        predictions = Prediction.query.filter_by(user_id=user_id).order_by(
            Prediction.created_at.desc()
        ).all()
        
        # Create CSV file in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Date Created', 'Year', 'Month', 'Latitude', 'Longitude',
            'Tilt (deg)', 'Azimuth (deg)', 'Capacity (kW)', 'Panel Efficiency',
            'System Loss', 'Shading Factor', 'Predicted Energy (kWh)',
            'Confidence Score', 'System Cost (LKR)', 'Monthly Savings (LKR)',
            'Annual Savings (LKR)', 'ROI (%)', 'Payback Period (years)',
            'Scenario Name'
        ])
        
        # Write prediction data
        for pred in predictions:
            writer.writerow([
                pred.id,
                pred.created_at.isoformat(),
                pred.year,
                pred.month,
                pred.latitude,
                pred.longitude,
                pred.tilt_deg,
                pred.azimuth_deg,
                pred.installed_capacity_kw,
                pred.panel_efficiency,
                pred.system_loss,
                pred.shading_factor,
                pred.predicted_energy_kwh,
                pred.confidence_score,
                pred.estimated_cost_usd or 0,
                pred.monthly_savings_usd or 0,
                pred.annual_savings_usd or 0,
                pred.roi_percentage or 0,
                pred.payback_period_years or 0,
                pred.scenario_name or ''
            ])
        
        # Create response
        output.seek(0)
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        
        filename = f'solar_predictions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        # Send CSV as file download
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@export_bp.route('/predictions/json', methods=['GET'])
@jwt_required()
def export_predictions_json():
    """
    Export user's predictions to JSON
    """
    try:
        user_id = get_jwt_identity()
        
        # Fetch all predictions
        predictions = Prediction.query.filter_by(user_id=user_id).order_by(
            Prediction.created_at.desc()
        ).all()
        
        # Convert predictions to dict
        predictions_data = [p.to_dict() for p in predictions]
        
        # Prepare JSON in memory
        output = io.BytesIO()
        import json
        output.write(json.dumps(predictions_data, indent=2).encode('utf-8'))
        output.seek(0)
        
        filename = f'solar_predictions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        # Send JSON as file download
        return send_file(
            output,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

