from .auth import auth_bp
from .predictions import predictions_bp
from .admin import admin_bp

__all__ = ['auth_bp', 'predictions_bp', 'admin_bp']