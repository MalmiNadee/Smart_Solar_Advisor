from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.user import db, bcrypt, User
from routes.auth import auth_bp
from routes.predictions import predictions_bp
from routes.admin import admin_bp
from routes.weather import weather_bp
from routes.export import export_bp
from routes.profile import profile_bp
from routes.reports import reports_bp
from sqlalchemy import and_
from sqlalchemy import inspect, text
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

# Disable default Flask request logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)  # Only show errors
log.disabled = True
logging.getLogger('flask.app').disabled = True

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend access
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3001"}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token'}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing'}), 401

    # Register API routes
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'Smart Solar Advisor API'}), 200

    # Database initialization and setup
    with app.app_context():
        db.create_all()

        # Add missing columns to predictions table if needed
        try:
            inspector = inspect(db.engine)
            if inspector.has_table('predictions'):
                existing_columns = [col['name'] for col in inspector.get_columns('predictions')]
                columns_to_add = {
                    'estimated_cost_usd': 'FLOAT',
                    'monthly_savings_usd': 'FLOAT',
                    'annual_savings_usd': 'FLOAT',
                    'roi_percentage': 'FLOAT',
                    'payback_period_years': 'FLOAT'
                }

                for col_name, col_type in columns_to_add.items():
                    if col_name not in existing_columns:
                        with db.engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logging.info(f"Added missing column: {col_name}")
        except Exception as e:
            logging.warning(f"Database migration check failed: {e}")

        # Create default admin if not exists
        admin_exists = db.session.query(
            db.session.query(User)
            .filter(and_(User.username == 'admin', User.is_admin == True))
            .exists()
        ).scalar()

        if not admin_exists:
            admin_user = User(
                username='admin',
                email='admin@solarsystem.com',
                is_admin=True
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()

    return app

MODEL_METRICS = {
    "MAE": 51.13,       # Mean Absolute Error in kWh
    "RMSE": 62.40,      # Root Mean Squared Error in kWh
    "R2": 0.9580        # R² Score
}

if __name__ == '__main__':
    PORT = 5009
    app = create_app()

    logging.info("Model Performance Metrics")
    logging.info(f"MAE  : {MODEL_METRICS['MAE']:.2f} kWh")
    logging.info(f"RMSE : {MODEL_METRICS['RMSE']:.2f} kWh")
    logging.info(f"R²   : {MODEL_METRICS['R2']:.4f}")
    print(f"Backend Running on port {PORT}")
    app.run(debug=False, host='0.0.0.0', port=PORT)
