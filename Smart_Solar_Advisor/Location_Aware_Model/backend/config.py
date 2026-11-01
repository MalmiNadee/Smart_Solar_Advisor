import os
from datetime import timedelta

class Config:
    """Application configuration settings"""
    # Flask secret key (used for sessions & security)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database connection string
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///solar_advisor.db'
    
    # Disable SQLAlchemy event system to save memory
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Secret key for secure user authentication (JWT Token)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    
    # JWT token expiry time
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Folder to store uploaded files
    UPLOAD_FOLDER = 'data'

    # Maximum upload size (16 MB)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024