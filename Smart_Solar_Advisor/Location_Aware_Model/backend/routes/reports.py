from flask import Blueprint, send_file, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.prediction import Prediction
from models.user import User
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io
from datetime import datetime
import calendar
from sqlalchemy import and_

reports_bp = Blueprint("reports", __name__)

def format_currency_lkr(amount):
    """Format amount as LKR currency"""
    if amount is None:
        return "N/A"
    return f"LKR {amount:,.2f}"

def get_month_name(month_num):
    """Get month name from number"""
    return calendar.month_name[month_num]

# Monthly PDF Report Generation
@reports_bp.route("/prediction/<int:prediction_id>/pdf", methods=["GET"])
@jwt_required()
def generate_prediction_pdf(prediction_id):
    """Generate comprehensive monthly prediction PDF report"""
    user_id = get_jwt_identity()

    # Fetch prediction for the user
    prediction = Prediction.query.filter_by(
        id=prediction_id,
        user_id=user_id
    ).first()

    if not prediction:
        return jsonify({"error": "Prediction not found"}), 404

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           rightMargin=2*cm, leftMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    elements.append(Paragraph(f"<b>Monthly Solar Energy Prediction Report - {get_month_name(prediction.month)} {prediction.year}</b>", title_style))
    elements.append(Spacer(1, 0.2*cm))
    
    # Subtitle
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#424242'),
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", subtitle_style))
    elements.append(Spacer(1, 0.2*cm))
    
    # Summary Section
    summary_style = ParagraphStyle(
        'SummaryStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Summary", summary_style))
    
    # Summary data
    summary_data = [
        ['Metric', 'Value'],
        ['Predicted Energy Output', f"{prediction.predicted_energy_kwh:.2f} kWh"],
        ['Confidence Score', f"{prediction.confidence_score * 100:.1f}%"],
        ['Monthly Savings', format_currency_lkr(prediction.monthly_savings_usd)],
        ['Annual Savings (Projected)', format_currency_lkr(prediction.annual_savings_usd)],
        ['System Cost', format_currency_lkr(prediction.estimated_cost_usd)],
        ['ROI', f"{prediction.roi_percentage:.2f}%" if prediction.roi_percentage else "N/A"],
        ['Payback Period', f"{prediction.payback_period_years:.2f} years" if prediction.payback_period_years else "N/A"]
    ]
    
    summary_table = Table(summary_data, colWidths=[9*cm, 7*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Location & System Details Section
    elements.append(Paragraph("Location & System Configuration", summary_style))
    
    location_data = [
        ['Parameter', 'Value'],
        ['Latitude', f"{prediction.latitude:.6f}°"],
        ['Longitude', f"{prediction.longitude:.6f}°"],
        ['Month', f"{get_month_name(prediction.month)} {prediction.year}"],
        ['Roof Tilt Angle', f"{prediction.tilt_deg:.1f}°"],
        ['Azimuth Angle', f"{prediction.azimuth_deg:.1f}°"],
        ['Installed Capacity', f"{prediction.installed_capacity_kw:.2f} kW"],
        ['Panel Efficiency', f"{prediction.panel_efficiency * 100:.1f}%"],
        ['System Loss', f"{prediction.system_loss * 100:.1f}%"],
        ['Shading Factor', f"{prediction.shading_factor:.3f}"]
    ]
    
    if prediction.scenario_name:
        location_data.append(['Scenario Name', prediction.scenario_name])
    
    location_table = Table(location_data, colWidths=[9*cm, 7*cm])
    location_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#388e3c')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(location_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Financial Analysis Section
    if prediction.monthly_savings_usd:
        elements.append(Paragraph("Financial Analysis", summary_style))
        
        financial_data = [
            ['Financial Metric', 'Amount'],
            ['System Installation Cost', format_currency_lkr(prediction.estimated_cost_usd)],
            ['Monthly Energy Savings', format_currency_lkr(prediction.monthly_savings_usd)],
            ['Annual Energy Savings', format_currency_lkr(prediction.annual_savings_usd)],
            ['Return on Investment (ROI)', f"{prediction.roi_percentage:.2f}%" if prediction.roi_percentage else "N/A"],
            ['Payback Period', f"{prediction.payback_period_years:.2f} years" if prediction.payback_period_years else "N/A"]
        ]
        
        financial_table = Table(financial_data, colWidths=[9*cm, 7*cm])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(financial_table)
        elements.append(Spacer(1, 0.6*cm))
    
    # Footer
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Spacer(1, 1.5*cm))
    elements.append(Paragraph("<b>Smart Solar Advisor</b> - IoT-Enabled Hybrid ML for Location-Aware Solar Prediction", footer_style))
    elements.append(Paragraph("Project ID: 25-26J-527 | Generated by Smart Solar Advisor System", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"solar_prediction_{get_month_name(prediction.month)}_{prediction.year}_{prediction.id}.pdf"
    
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )

# Annual PDF Report Generation
@reports_bp.route("/prediction/annual/<int:year>/pdf", methods=["GET"])
@jwt_required()
def generate_annual_prediction_pdf(year):
    """Generate comprehensive annual prediction PDF report with all 12 months"""
    user_id = get_jwt_identity()
    
    # Get query parameters
    latitude = request.args.get('latitude', type=float)
    longitude = request.args.get('longitude', type=float)
    
    # Build query
    query = Prediction.query.filter_by(
        user_id=user_id,
        year=year
    )
    
    if latitude is not None and longitude is not None:
        query = query.filter_by(latitude=latitude, longitude=longitude)
    
    all_predictions = query.order_by(Prediction.month.asc()).all()
    
    if not all_predictions:
        return jsonify({"error": "No predictions found for the specified year and location"}), 404
    
    # Group predictions by month and take only the latest prediction for each month
    monthly_predictions = {}
    for pred in all_predictions:
        month_key = pred.month
        if month_key not in monthly_predictions:
            monthly_predictions[month_key] = pred
        else:
            # Keep the most recent prediction
            if pred.id > monthly_predictions[month_key].id:
                monthly_predictions[month_key] = pred
    
    # Sort predictions by month
    predictions = [monthly_predictions[month] for month in sorted(monthly_predictions.keys())]
    
    if not predictions:
        return jsonify({"error": "No valid predictions found"}), 404
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           rightMargin=2*cm, leftMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Annual Solar Energy Prediction Report", title_style))
    elements.append(Spacer(1, 0.3*cm))
    
    # Subtitle
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#424242'),
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Paragraph(f"<b>Year {year} - Complete Analysis</b>", subtitle_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", subtitle_style))
    elements.append(Spacer(1, 0.6*cm))
    
    # Calculate totals
    total_annual_energy = sum(p.predicted_energy_kwh for p in predictions)
    num_months = len(predictions)
    avg_monthly_energy = total_annual_energy / num_months if num_months > 0 else 0
    avg_confidence = sum(p.confidence_score for p in predictions) / num_months if num_months > 0 else 0
    
    # Get first prediction for location/system details
    first_pred = predictions[0]
    total_system_cost = first_pred.estimated_cost_usd or 0
    total_annual_savings = sum(p.monthly_savings_usd or 0 for p in predictions)
    avg_monthly_savings = total_annual_savings / num_months if num_months > 0 else 0
    
    #  Summary
    summary_style = ParagraphStyle(
        'SummaryStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=4,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph(" Summary", summary_style))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Annual Energy Output', f"{total_annual_energy:.2f} kWh"],
        ['Average Monthly Energy', f"{avg_monthly_energy:.2f} kWh"],
        ['Number of Months', f"{num_months} months"],
        ['Average Confidence Score', f"{avg_confidence * 100:.1f}%"],
        ['Total Annual Savings', format_currency_lkr(total_annual_savings)],
        ['Average Monthly Savings', format_currency_lkr(avg_monthly_savings)],
        ['System Installation Cost', format_currency_lkr(total_system_cost)],
    ]
    
    if first_pred.roi_percentage:
        summary_data.append(['Return on Investment (ROI)', f"{first_pred.roi_percentage:.2f}%"])
    if first_pred.payback_period_years:
        summary_data.append(['Payback Period', f"{first_pred.payback_period_years:.2f} years"])
    
    summary_table = Table(summary_data, colWidths=[9*cm, 7*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Location & System Details
    elements.append(Paragraph("Location & System Configuration", summary_style))
    
    location_data = [
        ['Parameter', 'Value'],
        ['Latitude', f"{first_pred.latitude:.6f}°"],
        ['Longitude', f"{first_pred.longitude:.6f}°"],
        ['Roof Tilt Angle', f"{first_pred.tilt_deg:.1f}°"],
        ['Azimuth Angle', f"{first_pred.azimuth_deg:.1f}°"],
        ['Installed Capacity', f"{first_pred.installed_capacity_kw:.2f} kW"],
        ['Panel Efficiency', f"{first_pred.panel_efficiency * 100:.1f}%"],
        ['System Loss', f"{first_pred.system_loss * 100:.1f}%"],
        ['Average Shading Factor', f"{sum(p.shading_factor for p in predictions) / num_months:.3f}"]
    ]
    
    location_table = Table(location_data, colWidths=[9*cm, 7*cm])
    location_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#388e3c')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(location_table)
    
    # Monthly Breakdown
    elements.append(Paragraph("Monthly Energy Production Breakdown", summary_style))
    elements.append(Spacer(1, 0.3*cm))
    
    monthly_data = [['Month', 'Energy (kWh)', 'Savings', 'Confidence']]
    
    for pred in predictions:
        month_name = get_month_name(pred.month)
        monthly_data.append([
            month_name,
            f"{pred.predicted_energy_kwh:.2f}",
            format_currency_lkr(pred.monthly_savings_usd or 0),
            f"{pred.confidence_score * 100:.1f}%"
        ])
    
    # Add totals row
    monthly_data.append([
        'TOTAL',
        f"{total_annual_energy:.2f}",
        format_currency_lkr(total_annual_savings),
        f"{avg_confidence * 100:.1f}%"
    ])
    
    monthly_table = Table(monthly_data, colWidths=[3.5*cm, 3*cm, 4*cm, 2.5*cm])
    monthly_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#ffa726')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.lightgrey])
    ]))
    elements.append(monthly_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Financial Analysis
    if total_annual_savings > 0:
        elements.append(Paragraph("Financial Analysis", summary_style))
        
        financial_data = [
            ['Financial Metric', 'Amount'],
            ['System Installation Cost', format_currency_lkr(total_system_cost)],
            ['Total Annual Energy Savings', format_currency_lkr(total_annual_savings)],
            ['Average Monthly Savings', format_currency_lkr(avg_monthly_savings)],
        ]
        
        if first_pred.roi_percentage:
            financial_data.append(['Return on Investment (ROI)', f"{first_pred.roi_percentage:.2f}%"])
        if first_pred.payback_period_years:
            financial_data.append(['Payback Period', f"{first_pred.payback_period_years:.2f} years"])
        
        # Calculate best and worst months
        best_month = max(predictions, key=lambda p: p.predicted_energy_kwh)
        worst_month = min(predictions, key=lambda p: p.predicted_energy_kwh)
        
        financial_data.extend([
            ['Best Production Month', f"{get_month_name(best_month.month)} ({best_month.predicted_energy_kwh:.2f} kWh)"],
            ['Lowest Production Month', f"{get_month_name(worst_month.month)} ({worst_month.predicted_energy_kwh:.2f} kWh)"]
        ])
        
        financial_table = Table(financial_data, colWidths=[9*cm, 7*cm])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7b1fa2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(financial_table)
    
    # Footer
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Spacer(1, 1.5*cm))
    elements.append(Paragraph("<b>Smart Solar Advisor</b> - IoT-Enabled Hybrid ML for Location-Aware Solar Prediction", footer_style))
    elements.append(Paragraph("Project ID: 25-26J-527 | Generated by Smart Solar Advisor System", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"annual_solar_report_{year}_{first_pred.latitude:.2f}_{first_pred.longitude:.2f}.pdf"

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )