"""Evaluate prediction accuracy directly from Firebase data."""

import argparse
import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from firebase_config import ref


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate prediction accuracy metrics.")
    parser.add_argument(
        "--actual-col",
        default="actual_kwh_per5min",
        help="Actual value column/key name (default: actual_kwh_per5min).",
    )
    parser.add_argument(
        "--pred-col",
        default="predicted_kwh_per5min",
        help="Predicted value column/key name (default: predicted_kwh_per5min).",
    )
    parser.add_argument(
        "--time-col",
        default="timestamp",
        help="Timestamp column/key name for ordering (default: timestamp).",
    )
    parser.add_argument(
        "--firebase-path",
        default="predicted_units",
        help="Firebase path to evaluate (default: predicted_units).",
    )
    parser.add_argument("--train-ratio", type=float, default=0.7, help="Train split ratio (default: 0.7).")
    parser.add_argument("--val-ratio", type=float, default=0.15, help="Validation split ratio (default: 0.15).")
    parser.add_argument("--test-ratio", type=float, default=0.15, help="Test split ratio (default: 0.15).")
    return parser.parse_args()


def _safe_float(value: str) -> Optional[float]:
    try:
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return None
        return num
    except (TypeError, ValueError):
        return None


def parse_time(value: str) -> datetime:
    if not value:
        return datetime.min

    candidates = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%Y%m%d_%H%M%S",
    ]
    for fmt in candidates:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return datetime.min


def load_rows_from_firebase(
    firebase_path: str, actual_col: str, pred_col: str, time_col: str
) -> List[Dict[str, object]]:
    source = ref if firebase_path == "predicted_units" else ref.child(firebase_path)
    raw_data = source.get() or {}

    rows: List[Dict[str, object]] = []
    seen_keys = set()
    idx = 0

    for customer in raw_data.values():
        if not isinstance(customer, dict):
            continue
        for site in customer.values():
            if not isinstance(site, dict):
                continue
            for timestamp_key, record in site.items():
                if not isinstance(record, dict):
                    continue
                seen_keys.update(record.keys())

                actual = _safe_float(record.get(actual_col, ""))
                pred = _safe_float(record.get(pred_col, ""))
                if actual is None or pred is None:
                    continue

                row_time = str(record.get(time_col) or timestamp_key or idx)
                rows.append({"idx": idx, "time": row_time, "actual": actual, "pred": pred})
                idx += 1

    if not rows:
        raise ValueError(
            f"No valid rows in Firebase path '{firebase_path}'. "
            f"Ensure both keys exist: {actual_col}, {pred_col}. "
            f"Available keys sample: {', '.join(sorted(seen_keys)) if seen_keys else 'none'}"
        )

    rows.sort(key=lambda r: (parse_time(str(r["time"])), int(r["idx"])))
    return rows


def split_rows(
    rows: List[Dict[str, object]], train_ratio: float, val_ratio: float, test_ratio: float
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]], List[Dict[str, object]]]:
    total_ratio = train_ratio + val_ratio + test_ratio
    if not math.isclose(total_ratio, 1.0, rel_tol=1e-9, abs_tol=1e-9):
        raise ValueError("train_ratio + val_ratio + test_ratio must equal 1.0")

    n = len(rows)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)
    n_test = n - n_train - n_val

    # Ensure test split is never empty for reporting.
    if n_test <= 0:
        n_test = 1
        if n_val > 0:
            n_val -= 1
        elif n_train > 1:
            n_train -= 1

    train_rows = rows[:n_train]
    val_rows = rows[n_train : n_train + n_val]
    test_rows = rows[n_train + n_val :]
    return train_rows, val_rows, test_rows


def compute_metrics(rows: List[Dict[str, object]]) -> Dict[str, float]:
    n = len(rows)
    if n == 0:
        return {"count": 0, "mae": float("nan"), "rmse": float("nan"), "mape": float("nan"), "r2": float("nan")}

    actual = [float(r["actual"]) for r in rows]
    pred = [float(r["pred"]) for r in rows]

    abs_errors = [abs(a - p) for a, p in zip(actual, pred)]
    sq_errors = [(a - p) ** 2 for a, p in zip(actual, pred)]
    # Average error in prediction (Mean Absolute Error)
    mae = sum(abs_errors) / n
    # Penalizes larger errors (Root Mean Square Error)
    rmse = math.sqrt(sum(sq_errors) / n)

    non_zero_actual = [(a, p) for a, p in zip(actual, pred) if a != 0]
    if non_zero_actual:
        mape = (
            sum(abs((a - p) / a) for a, p in non_zero_actual) / len(non_zero_actual)
        ) * 100.0
    else:
        mape = float("nan") #(Percentage Error)

    mean_actual = sum(actual) / n
    ss_res = sum((a - p) ** 2 for a, p in zip(actual, pred))
    ss_tot = sum((a - mean_actual) ** 2 for a in actual)
    if ss_tot == 0:
        r2 = float("nan") # Measures how well model fits data
    else:
        r2 = 1 - (ss_res / ss_tot)

    return {"count": float(n), "mae": mae, "rmse": rmse, "mape": mape, "r2": r2}


def fmt(x: float) -> str:
    if math.isnan(x):
        return "nan"
    return f"{x:.6f}"


def print_metrics(name: str, metrics: Dict[str, float]) -> None:
    print(f"\n{name}")
    print("-" * len(name))
    print(f"Count : {int(metrics['count'])}")
    print(f"MAE   : {fmt(metrics['mae'])}")
    print(f"RMSE  : {fmt(metrics['rmse'])}")
    print(f"MAPE% : {fmt(metrics['mape'])}")
    print(f"R2    : {fmt(metrics['r2'])}")


def main() -> None:
    args = parse_args()
    rows = load_rows_from_firebase(args.firebase_path, args.actual_col, args.pred_col, args.time_col)
    source_name = f"Firebase: {args.firebase_path}"

    train_rows, val_rows, test_rows = split_rows(rows, args.train_ratio, args.val_ratio, args.test_ratio)

    print(f"Source: {source_name}")
    print(f"Loaded valid rows: {len(rows)}")
    print(f"Split sizes -> train: {len(train_rows)}, val: {len(val_rows)}, test: {len(test_rows)}")

    print_metrics("Train Metrics", compute_metrics(train_rows))
    print_metrics("Validation Metrics", compute_metrics(val_rows))
    print_metrics("Test Metrics", compute_metrics(test_rows))


if __name__ == "__main__":
    main()
