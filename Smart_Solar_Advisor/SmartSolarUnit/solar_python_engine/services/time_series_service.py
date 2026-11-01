"""
Time-series analysis using Prophet (Facebook) for solar energy daily data.
Produces forecast, trend, and seasonality components.
"""

from typing import List, Dict, Any, Optional


def forecast_prophet(
    daily_data: List[Dict[str, Any]],
    periods: int = 30,
    freq: str = "D",
) -> Dict[str, Any]:
    """
    Run Prophet on daily (date, value) series.
    daily_data: [ {"date": "YYYY-MM-DD", "value": float or "totalKwh": float}, ... ]
    periods: number of days to forecast
    Returns: forecast array, trend, weekly/yearly seasonality if available.
    """
    if not daily_data or len(daily_data) < 7:
        return {
            "error": True,
            "message": "Need at least 7 days of data for Prophet.",
            "forecast": [],
            "history": daily_data,
        }
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError as e:
        return {
            "error": True,
            "message": "Prophet not installed. Run: pip install prophet",
            "forecast": [],
            "history": daily_data,
        }

    try:
        rows = []
        for row in daily_data:
            ds = row.get("date") or row.get("ds")
            y = row.get("value") if "value" in row else row.get("totalKwh", 0)
            if ds is None:
                continue
            rows.append({"ds": str(ds), "y": float(y)})
        df = pd.DataFrame(rows)
        df = df.dropna(subset=["y"])
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.sort_values("ds").reset_index(drop=True)

        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.9,
        )
        m.fit(df)

        future = m.make_future_dataframe(periods=periods, freq=freq)
        future = future[future["ds"] > df["ds"].max()]
        forecast_df = m.predict(future)

        forecast_out = []
        for _, r in forecast_df.iterrows():
            forecast_out.append({
                "date": r["ds"].strftime("%Y-%m-%d"),
                "yhat": round(float(r["yhat"]), 4),
                "yhat_lower": round(float(r.get("yhat_lower", r["yhat"])), 4),
                "yhat_upper": round(float(r.get("yhat_upper", r["yhat"])), 4),
                "trend": round(float(r.get("trend", r["yhat"])), 4),
            })

        history_out = [{"date": r["ds"].strftime("%Y-%m-%d"), "value": float(r["y"])} for _, r in df.iterrows()]

        return {
            "error": False,
            "forecast": forecast_out,
            "history": history_out,
            "model": "prophet",
            "periods": periods,
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "forecast": [],
            "history": daily_data,
        }


def forecast_sarima(
    daily_data: List[Dict[str, Any]],
    periods: int = 30,
) -> Dict[str, Any]:
    """
    Optional SARIMA fallback if Prophet fails or not installed.
    daily_data: same as Prophet.
    """
    if not daily_data or len(daily_data) < 14:
        return {
            "error": True,
            "message": "Need at least 14 days for SARIMA.",
            "forecast": [],
        }
    try:
        import pandas as pd
        from statsmodels.tsa.statespace.sarimax import SARIMAX
    except ImportError:
        return {
            "error": True,
            "message": "statsmodels not installed. Run: pip install statsmodels",
            "forecast": [],
        }
    try:
        rows = []
        for row in daily_data:
            ds = row.get("date") or row.get("ds")
            y = row.get("value") if "value" in row else row.get("totalKwh", 0)
            if ds is None:
                continue
            rows.append({"ds": str(ds), "y": float(y)})
        df = pd.DataFrame(rows)
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.sort_values("ds").set_index("ds")
        df = df.asfreq("D").ffill().fillna(0)

        model = SARIMAX(df["y"], order=(1, 0, 1), seasonal_order=(1, 0, 1, 7))
        fit = model.fit(disp=False)
        f = fit.get_forecast(steps=periods)
        forecast_df = f.summary_frame()

        forecast_out = []
        for i, (ts, r) in enumerate(forecast_df.iterrows()):
            forecast_out.append({
                "date": ts.strftime("%Y-%m-%d"),
                "yhat": round(float(r["mean"]), 4),
                "yhat_lower": round(float(r.get("mean_ci_lower", r["mean"])), 4),
                "yhat_upper": round(float(r.get("mean_ci_upper", r["mean"])), 4),
            })
        return {
            "error": False,
            "forecast": forecast_out,
            "model": "sarima",
            "periods": periods,
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "forecast": [],
        }
