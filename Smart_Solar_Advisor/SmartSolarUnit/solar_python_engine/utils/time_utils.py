from datetime import datetime, timezone

def firebase_safe_timestamp() -> str:
    """
    Returns Firebase-safe timestamp string
    Example: 20251221_193958
    """
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
