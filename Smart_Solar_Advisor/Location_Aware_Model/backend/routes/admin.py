from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models.user import db, User
from models.prediction import Prediction
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

def admin_required():
    """Check if user is admin"""
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if not claims.get('is_admin'):
                return jsonify({'error': 'Admin access required'}), 403
            return fn(*args, **kwargs)
        decorator.__name__ = fn.__name__
        return decorator
    return wrapper

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_all_users():
    """Retrieve all registered users"""
    try:
        users = User.query.all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(user_id):
    """Delete user accounts"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
    
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/predictions', methods=['GET'])
@admin_required()
def get_all_predictions():
    """Retrieve recent predictions for monitoring"""
    try:
        predictions = Prediction.query.order_by(
            Prediction.created_at.desc()
        ).limit(1000).all()
        
        return jsonify({
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/statistics', methods=['GET'])
@admin_required()
def get_statistics():
    try:
        # User statistics
        total_users = User.query.count()
        admin_users = User.query.filter_by(is_admin=True).count()
        
        # Prediction statistics
        total_predictions = Prediction.query.count()
        avg_energy = db.session.query(
            func.avg(Prediction.predicted_energy_kwh)
        ).scalar()
        avg_confidence = db.session.query(
            func.avg(Prediction.confidence_score)
        ).scalar()
        
        # Monthly predictions count
        monthly_counts = db.session.query(
            Prediction.month,
            func.count(Prediction.id)
        ).group_by(Prediction.month).all()
        
        # Top users by prediction count
        top_users = db.session.query(
            User.username,
            func.count(Prediction.id).label('prediction_count')
        ).join(Prediction).group_by(User.id).order_by(
            func.count(Prediction.id).desc()
        ).limit(10).all()
        
        return jsonify({
            'users': {
                'total': total_users,
                'admins': admin_users,
                'regular': total_users - admin_users
            },
            'predictions': {
                'total': total_predictions,
                'average_energy_kwh': float(avg_energy) if avg_energy else 0,
                'average_confidence': float(avg_confidence) if avg_confidence else 0,
                'by_month': [
                    {'month': m, 'count': c} for m, c in monthly_counts
                ]
            },
            'top_users': [
                {'username': u, 'prediction_count': c} for u, c in top_users
            ]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PATCH'])
@admin_required()
def toggle_admin(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Cannot modify own admin status
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot modify your own admin status'}), 400
        
        user.is_admin = not user.is_admin
        db.session.commit()
        
        return jsonify({
            'message': 'Admin status updated',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500