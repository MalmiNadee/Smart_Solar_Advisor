"""
XAI + Time-Series Flask server for Smart Solar Advisor.
Exposes SHAP, LIME, and Prophet/SARIMA time-series forecast.
Run: python xai_server.py
Default port: 8085 (or PORT env)
"""

from flask import Flask, request, jsonify
from services.xai_service import get_shap_explanation, get_lime_explanation, get_feature_importance_global
from services.time_series_service import forecast_prophet, forecast_sarima

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "xai"})


@app.route("/api/xai/shap", methods=["POST"])
def shap():
    data = request.get_json() or {}
    features = data.get("features") or data.get("feature_used") or {}
    if not features:
        return jsonify({"error": True, "message": "Missing 'features' in body"}), 400
    result = get_shap_explanation(features)
    return jsonify(result)


@app.route("/api/xai/lime", methods=["POST"])
def lime():
    data = request.get_json() or {}
    features = data.get("features") or data.get("feature_used") or {}
    if not features:
        return jsonify({"error": True, "message": "Missing 'features' in body"}), 400
    result = get_lime_explanation(features)
    return jsonify(result)


@app.route("/api/xai/feature-importance", methods=["GET"])
def feature_importance():
    result = get_feature_importance_global()
    return jsonify(result)


# ---------- Time-Series (Prophet / SARIMA) ----------

@app.route("/api/timeseries/forecast", methods=["POST"])
def timeseries_forecast():
    data = request.get_json() or {}
    daily_data = data.get("daily_data") or data.get("history") or []
    periods = int(data.get("periods", 30))
    use_sarima = data.get("model") == "sarima"
    if not daily_data:
        return jsonify({"error": True, "message": "Missing 'daily_data' in body"}), 400
    if use_sarima:
        result = forecast_sarima(daily_data, periods=periods)
    else:
        result = forecast_prophet(daily_data, periods=periods)
    return jsonify(result)


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8085))
    app.run(host="0.0.0.0", port=port, debug=False)
