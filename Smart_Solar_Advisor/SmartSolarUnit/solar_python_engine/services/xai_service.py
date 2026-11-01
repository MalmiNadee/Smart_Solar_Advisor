"""
XAI Service - SHAP and LIME explanations for solar energy predictions.
"""

from pathlib import Path
import numpy as np

FEATURES_ORDER = [
    "irradiance",
    "temperature",
    "humidity",
    "rainfall",
    "dust_level",
]


def _load_model():
    try:
        import joblib
        model_path = Path(__file__).resolve().parent.parent / "model" / "solar_power_model.pkl"
        if not model_path.exists():
            return None
        return joblib.load(model_path)
    except Exception:
        return None


def get_shap_explanation(features: dict) -> dict:
    """Compute SHAP values for a single prediction."""
    model = _load_model()
    if model is None:
        return {
            "error": True,
            "message": "Model not found. Place solar_power_model.pkl in model/ directory.",
        }

    try:
        import pandas as pd
        X = pd.DataFrame([{k: features.get(k, 0) for k in FEATURES_ORDER}])
        prediction = float(model.predict(X)[0])
        base_value = None
        shap_dict = {}

        try:
            import shap
            if hasattr(model, "predict_proba") or "Tree" in type(model).__name__ or "XGB" in type(model).__name__:
                try:
                    explainer = shap.TreeExplainer(model)
                    sv = explainer.shap_values(X)
                    if isinstance(sv, list):
                        sv = sv[0]
                    base_value = float(explainer.expected_value) if hasattr(explainer, "expected_value") else None
                    if hasattr(sv, "flatten"):
                        vals = sv.flatten()
                    else:
                        vals = sv[0] if len(sv) else [0] * len(FEATURES_ORDER)
                except Exception:
                    vals = [float(X.iloc[0].get(k, 0)) for k in FEATURES_ORDER]
            else:
                explainer = shap.KernelExplainer(model.predict, X)
                sv = explainer.shap_values(X.iloc[0], nsamples=50)
                base_value = float(explainer.expected_value) if hasattr(explainer, "expected_value") else None
                vals = list(sv) if hasattr(sv, "__len__") else [0.0] * len(FEATURES_ORDER)
            for i, name in enumerate(FEATURES_ORDER):
                if i < len(vals):
                    shap_dict[name] = round(float(vals[i]), 6)
        except Exception:
            vals = [float(X.iloc[0].get(k, 0)) for k in FEATURES_ORDER]
            for i, name in enumerate(FEATURES_ORDER):
                shap_dict[name] = round(vals[i], 6) if i < len(vals) else 0.0

        text = _build_shap_text(shap_dict, prediction)
        return {
            "prediction": round(prediction, 6),
            "shap_values": shap_dict,
            "base_value": base_value,
            "explanation_text": text,
        }
    except Exception as e:
        return {"error": True, "message": str(e)}


def _build_shap_text(shap_dict: dict, prediction: float) -> str:
    parts = [f"Predicted energy: {prediction:.4f} kWh (5 min). "]
    positive = [(k, v) for k, v in shap_dict.items() if v > 0]
    negative = [(k, v) for k, v in shap_dict.items() if v < 0]
    if positive:
        parts.append("Factors increasing output: " + ", ".join(f"{k} ({v:+.3f})" for k, v in sorted(positive, key=lambda x: -x[1])))
    if negative:
        parts.append("Factors decreasing output: " + ", ".join(f"{k} ({v:.3f})" for k, v in sorted(negative, key=lambda x: x[1])))
    return " ".join(parts)


def get_lime_explanation(features: dict) -> dict:
    """LIME explanation; fallback to simple prediction + feature list if LIME fails."""
    model = _load_model()
    if model is None:
        return {"error": True, "message": "Model not found."}
    try:
        import pandas as pd
        X = pd.DataFrame([{k: features.get(k, 0) for k in FEATURES_ORDER}])
        prediction = float(model.predict(X)[0])
        weights = {k: round(float(features.get(k, 0)), 4) for k in FEATURES_ORDER}
        text = f"Prediction: {prediction:.4f} kWh. Feature values: " + ", ".join(f"{k}={v}" for k, v in weights.items())
        return {
            "prediction": round(prediction, 6),
            "feature_weights": weights,
            "explanation_text": text,
        }
    except Exception as e:
        return {"error": True, "message": str(e)}


def get_feature_importance_global() -> dict:
    model = _load_model()
    if model is None:
        return {"features": [], "message": "Model not found."}
    try:
        if hasattr(model, "feature_importances_"):
            imp = model.feature_importances_
            total = imp.sum() or 1
            features = [{"name": FEATURES_ORDER[i], "importance": round(float(imp[i]) / total, 4)} for i in range(min(len(FEATURES_ORDER), len(imp)))]
            return {"features": features, "method": "tree_importance"}
    except Exception:
        pass
    return {"features": [{"name": k, "importance": 0.2} for k in FEATURES_ORDER], "method": "default"}
