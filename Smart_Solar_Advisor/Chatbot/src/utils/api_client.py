"""
Live data API client for the Smart Solar Advisor.

Connects to three monitoring APIs provided by other project components:
  - /sites-summary      : list all registered solar sites
  - /nearest-location   : latest sensor readings closest to a lat/lon
  - /aggregate-data     : daily or monthly averages for a lat/lon

A geocoding API is used to convert user-supplied location names to coordinates.
"""
import os
import re
import requests
from dotenv import load_dotenv
from typing import Dict, List, Optional

load_dotenv()

# ---------------------------------------------------------------------------
# Endpoint configuration
# ---------------------------------------------------------------------------
_SITES_URL    = "https://nbbackend.solaradvisor.site/sites-summary"
_NEAREST_URL  = "https://nbbackend.solaradvisor.site/nearest-location"
_AGGREGATE_URL = "https://nbbackend.solaradvisor.site/aggregate-data"
_GEO_URL      = "http://api.openweathermap.org/geo/1.0/direct"
_GEO_APPID    = os.getenv("GEO_APPID", "")
_TIMEOUT      = 10  # seconds

# Words that are never place names — used when parsing the user query
_NON_PLACE_WORDS = {
    'today', 'now', 'that', 'this', 'the', 'solar', 'panel', 'what',
    'where', 'how', 'much', 'currently', 'level', 'monthly', 'daily',
    'yesterday', 'tomorrow', 'week', 'month', 'year', 'time', 'place',
    'unit', 'site', 'output', 'predict', 'tell', 'show', 'get', 'check',
    'give', 'me', 'latest', 'average', 'data', 'report', 'reading',
}


# ---------------------------------------------------------------------------
# Raw API calls
# ---------------------------------------------------------------------------

def get_sites_summary() -> List[Dict]:
    """GET /sites-summary — return all registered solar installation sites."""
    r = requests.get(_SITES_URL, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def get_coordinates(location_name: str) -> Optional[Dict]:
    """Resolve a location name to lat/lon via geocoding API.

    Returns a dict with keys ``lat``, ``lon``, ``name``, ``country``
    or ``None`` if the location is not found.
    """
    params = {"q": location_name, "limit": 1, "appid": _GEO_APPID}
    r = requests.get(_GEO_URL, params=params, timeout=_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data:
        return {
            "lat":     data[0]["lat"],
            "lon":     data[0]["lon"],
            "name":    data[0].get("name", location_name),
            "country": data[0].get("country", ""),
        }
    return None


def get_nearest_location_data(lat: float, lon: float) -> List[Dict]:
    """POST /nearest-location — latest sensor readings for a coordinate."""
    r = requests.post(
        _NEAREST_URL,
        json={"latitude": lat, "longitude": lon},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


def get_aggregate_data(lat: float, lon: float, mode: str = "daily") -> Dict:
    """POST /aggregate-data — aggregated stats for a coordinate.

    ``mode`` must be ``'daily'`` or ``'monthly'``.
    """
    r = requests.post(
        _AGGREGATE_URL,
        json={"latitude": lat, "longitude": lon, "mode": mode},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def detect_api_intent(query: str) -> Optional[str]:
    """Classify the query as an API intent or return None.

    Returns:
        ``'sites'``      — user wants to know about registered solar sites.
        ``'live_data'``  — user wants the latest sensor reading for a place.
        ``'aggregate'``  — user wants daily/monthly averages for a place.
        ``None``         — query is not related to live monitoring data.
    """
    q = query.lower()

    site_keywords = [
        'where', 'location', 'placed', 'installed', 'site', 'customer',
        'solar unit', 'sites', 'registered', 'monitored',
    ]
    live_keywords = [
        'dust level', 'humidity', 'irradiance', 'temperature', 'rainfall',
        'output', 'today', 'right now', 'current', 'latest', 'now', 'live',
        'reading', 'sensor',
    ]
    agg_keywords = [
        'monthly', 'daily', 'average', 'month', 'day', 'aggregate',
        'predict', 'kwh', 'total', 'prediction',
    ]

    has_live = any(kw in q for kw in live_keywords)
    has_agg  = any(kw in q for kw in agg_keywords)

    # Sites query: location/site keywords without data-specific keywords
    if any(kw in q for kw in site_keywords) and not has_live and not has_agg:
        return 'sites'

    # Aggregate takes priority when period keywords are present
    if has_agg:
        return 'aggregate'

    # Latest sensor reading
    if has_live:
        return 'live_data'

    return None


# ---------------------------------------------------------------------------
# Location name extraction
# ---------------------------------------------------------------------------

def extract_location_name(query: str) -> Optional[str]:
    """Try to pull a place name out of a natural-language query.

    Looks for words following common location prepositions (in, at, of, for,
    near) or immediately before time-stamp keywords.  Returns the candidate
    with title-case applied, or ``None`` if nothing suitable is found.
    """
    q = query.lower()

    # Words that should never be the trailing part of a place name
    _TRAILING_STRIP = (
        set(_MONTH_NUM.keys()) |
        {'month', 'months', 'year', 'years', 'week', 'weeks', 'day', 'days',
         'average', 'avg', 'daily', 'monthly', 'weekly', 'today', 'now',
         'currently', 'data', 'reading', 'level', 'report'}
    )

    patterns = [
        # "in gampaha", "at london", "of colombo", "for kandy", "near negombo"
        r'\b(?:in|at|of|for|near)\s+([a-zA-Z][a-zA-Z]*(?:\s+[a-zA-Z]+){0,2})',
        # "gampaha today", "colombo monthly"
        r'([a-zA-Z][a-zA-Z]+)\s+(?:today|monthly|daily|now|currently|location)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, q):
            candidate = match.group(1).strip()
            words = candidate.split()
            first = words[0] if words else ""
            # Skip common non-place words and digit-starting tokens (e.g. "4am")
            if first and first not in _NON_PLACE_WORDS and not re.match(r'\d', first):
                # Strip trailing month/time words that crept into the capture
                while words and words[-1].lower() in _TRAILING_STRIP:
                    words.pop()
                if words:
                    return " ".join(w.capitalize() for w in words)

    return None


def extract_time_mode(query: str) -> str:
    """Return ``'monthly'`` or ``'daily'`` based on the query wording."""
    if any(w in query.lower() for w in ("month", "monthly")):
        return "monthly"
    return "daily"


# Mapping: (keywords, live_field, agg_field, label, unit)
# agg_field is None when the metric does not appear in /aggregate-data.
_METRIC_MAP = [
    (["dust level", "dust"],               "dust_level",            "average_dust_level",  "Dust Level",       ""),
    (["humidity"],                          "humidity",              "average_humidity",    "Humidity",         "%"),
    (["irradiance"],                        "irradiance",            "average_irradiance",  "Irradiance",       "W/m²"),
    (["temperature"],                       "temperature",           "average_temperature", "Temperature",      "°C"),
    (["rainfall", "rain"],                  "rainfall",              "average_rainfall",    "Rainfall",         "mm"),
    (["predicted output", "output", "kwh"], "predicted_kwh_per5min", None,                  "Predicted Output", "kWh (per 5 min)"),
    (["panel area"],                        "panel_area_m2",         None,                  "Panel Area",       "m²"),
]


def extract_requested_metric(query: str):
    """Return ``(live_field, agg_field, label, unit)`` for the metric the user
    asked about, or ``None`` when no specific metric is detected.

    ``agg_field`` is ``None`` for metrics that only appear in live readings.
    """
    q = query.lower()
    for keywords, live_field, agg_field, label, unit in _METRIC_MAP:
        if any(kw in q for kw in keywords):
            return live_field, agg_field, label, unit
    return None


# ---------------------------------------------------------------------------
# Date extraction from natural-language queries
# ---------------------------------------------------------------------------

_MONTH_NUM = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12',
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
    'oct': '10', 'nov': '11', 'dec': '12',
}


def extract_date_from_query(query: str) -> Optional[str]:
    """Return an ISO date string (``YYYY-MM-DD``) found in *query*, or ``None``.

    Recognises:
    - ISO format:           ``2026-02-14``
    - Day-Month-Year:       ``14 February 2026``, ``14th Feb 2026``
    - Month-Day-Year:       ``February 14, 2026``, ``Feb 14 2026``
    """
    # ISO format
    m = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', query)
    if m:
        return m.group(1)

    q = query.lower()

    # Day-first: "14 february 2026", "14th feb 2026"
    m = re.search(
        r'\b(\d{1,2})(?:st|nd|rd|th)?\s+'
        r'(' + '|'.join(_MONTH_NUM) + r')\s+(\d{4})\b',
        q,
    )
    if m:
        day, month_name, year = m.group(1), m.group(2), m.group(3)
        return f"{year}-{_MONTH_NUM[month_name]}-{int(day):02d}"

    # Month-first: "february 14, 2026", "feb 14 2026"
    m = re.search(
        r'\b(' + '|'.join(_MONTH_NUM) + r')\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b',
        q,
    )
    if m:
        month_name, day, year = m.group(1), m.group(2), m.group(3)
        return f"{year}-{_MONTH_NUM[month_name]}-{int(day):02d}"

    return None


def extract_month_from_query(query: str) -> Optional[str]:
    """Return a period string for a specific month mentioned in *query*.

    Returns ``'YYYY-MM'`` when both year and month are found, ``'MM'`` when
    only a month name is found, or ``None`` when no month is mentioned.
    """
    q = query.lower()
    for name, num in _MONTH_NUM.items():
        if re.search(r'\b' + re.escape(name) + r'\b', q):
            year_m = re.search(r'\b(20\d{2})\b', q)
            if year_m:
                return f"{year_m.group(1)}-{num}"
            return num   # e.g. "01"
    return None


# ---------------------------------------------------------------------------
# Response formatters
# ---------------------------------------------------------------------------

def format_sites_response(sites: List[Dict]) -> str:
    if not sites:
        return "No solar installation sites are currently registered in the system."

    lines = [f"**Solar Installation Sites ({len(sites)} found):**\n"]
    for site in sites:
        lat = site.get("latitude", "N/A")
        lon = site.get("longitude", "N/A")
        lat_str = f"{lat:.4f}" if isinstance(lat, float) else str(lat)
        lon_str = f"{lon:.4f}" if isinstance(lon, float) else str(lon)
        lines.append(
            f"- **Site ID:** {site.get('site', 'N/A')}\n"
            f"  **Customer:** {site.get('customer', 'N/A')}\n"
            f"  **Coordinates:** {lat_str}°N, {lon_str}°E\n"
            f"  **First Recorded Date:** {site.get('first_date', 'N/A')}"
        )
    return "\n\n".join(lines)


def format_live_data_response(records: List[Dict], location_name: str, metric=None) -> str:
    """Format live sensor records for display.

    Args:
        records: List of sensor reading dicts from the API.
        location_name: Human-readable location name.
        metric: Optional ``(field_key, label, unit)`` tuple.  When provided
                only that metric is included in the response.
    """
    if not records:
        return f"No data found for **{location_name}**."

    if metric:
        field, _agg_field, label, unit = metric
        lines = [f"**{label} for {location_name}:**\n"]
        for rec in records:
            val = rec.get(field, "N/A")
            if isinstance(val, float) and field == "predicted_kwh_per5min":
                val_str = f"{val:.4f}"
            else:
                val_str = str(val)
            suffix = f" {unit}" if unit else ""
            lines.append(
                f"Date: {rec.get('date', 'N/A')} | Time: {rec.get('time', 'N/A')}\n"
                f"{label}: {val_str}{suffix}"
            )
        return "\n\n".join(lines)

    # Full response — all fields
    lines = [f"**Latest Solar Data for {location_name}:**\n"]
    for rec in records:
        kwh = rec.get("predicted_kwh_per5min")
        kwh_str = f"{kwh:.4f}" if isinstance(kwh, (int, float)) else str(kwh)
        lines.append(
            f"**Date:** {rec.get('date', 'N/A')}  |  **Time:** {rec.get('time', 'N/A')}\n"
            f"- Irradiance: {rec.get('irradiance', 'N/A')} W/m²\n"
            f"- Temperature: {rec.get('temperature', 'N/A')} °C\n"
            f"- Humidity: {rec.get('humidity', 'N/A')} %\n"
            f"- Dust Level: {rec.get('dust_level', 'N/A')}\n"
            f"- Rainfall: {rec.get('rainfall', 'N/A')} mm\n"
            f"- Panel Area: {rec.get('panel_area_m2', 'N/A')} m²\n"
            f"- Predicted Output: {kwh_str} kWh (per 5 min)"
        )
    return "\n\n".join(lines)


def format_aggregate_response(data: Dict, location_name: str, mode: str) -> str:
    if not data:
        return f"No {mode} data found for **{location_name}**."

    label = "Monthly" if mode == "monthly" else "Daily"
    lines = [f"**{label} Solar Data Averages for {location_name}:**\n"]
    for period, stats in data.items():
        def _fmt(val, decimals=2):
            return f"{val:.{decimals}f}" if isinstance(val, (int, float)) else str(val)

        lines.append(
            f"**Period:** {period}\n"
            f"- Avg Irradiance: {_fmt(stats.get('average_irradiance', 'N/A'))} W/m²\n"
            f"- Avg Temperature: {_fmt(stats.get('average_temperature', 'N/A'))} °C\n"
            f"- Avg Humidity: {_fmt(stats.get('average_humidity', 'N/A'))} %\n"
            f"- Avg Dust Level: {_fmt(stats.get('average_dust_level', 'N/A'), 4)}\n"
            f"- Avg Rainfall: {_fmt(stats.get('average_rainfall', 'N/A'))} mm"
        )
    return "\n\n".join(lines)


def format_aggregate_metric_response(
    agg_data: Dict,
    location_name: str,
    metric,                       # (live_field, agg_field, label, unit)
    target_date: Optional[str] = None,
) -> str:
    """Return a single-metric answer from daily aggregate data.

    When *target_date* is given the exact date is used (or the nearest
    available one if that date has no data).  When omitted the latest
    recorded date is used.
    """
    if not agg_data:
        return f"No aggregate data found for **{location_name}**."

    _live_field, agg_field, label, unit = metric
    suffix = f" {unit}" if unit else ""

    from datetime import datetime as _dt

    def _parse(d: str):
        for fmt in ("%Y-%m-%d", "%Y-%m"):
            try:
                return _dt.strptime(d, fmt)
            except ValueError:
                continue
        return None

    valid_keys = [k for k in agg_data if _parse(k) is not None]

    note = ""
    if target_date:
        if target_date in agg_data:
            # Exact match (e.g. "2026-01" or "2026-02-14")
            period = target_date
        elif re.match(r'^\d{2}$', target_date):
            # Bare month number (e.g. "01") — pick the most recent key with
            # that month regardless of year.
            matching = [k for k in valid_keys if _parse(k) and f"-{target_date}" in k]
            if matching:
                period = max(matching, key=_parse)
            else:
                period = max(valid_keys, key=_parse) if valid_keys else list(agg_data.keys())[-1]
                note = f" *(no data for month {target_date}, showing latest available)*"
        else:
            # Try to find the nearest date
            try:
                target_dt = _dt.strptime(target_date, "%Y-%m-%d")
                period = min(valid_keys, key=lambda d: abs((_parse(d) - target_dt).days))
                note = f" *(requested {target_date} — nearest available: {period})*"
            except (ValueError, TypeError):
                period = valid_keys[-1] if valid_keys else list(agg_data.keys())[-1]
    else:
        # Use the most recent date
        try:
            period = max(valid_keys, key=_parse)
        except (ValueError, TypeError):
            period = list(agg_data.keys())[-1]

    stats = agg_data[period]
    val = stats.get(agg_field, "N/A")
    if isinstance(val, float):
        val_str = f"{val:.4f}" if "dust" in agg_field else f"{val:.2f}"
    else:
        val_str = str(val)

    return (
        f"**{label} for {location_name}:**\n\n"
        f"Date: {period}{note}\n"
        f"{label}: {val_str}{suffix}"
    )
