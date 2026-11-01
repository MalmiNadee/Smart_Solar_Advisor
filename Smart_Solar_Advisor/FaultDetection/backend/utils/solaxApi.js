const axios = require('axios');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/**
 * Normalize SolaX realtime response keys into the schema expected by frontend.
 * SolaX APIs are not consistent across regions/versions (camelCase vs lowercase).
 */
function normalizeRealtimeData(raw = {}) {
  const normalized = {
    inverterSN: pick(raw, ['inverterSN', 'inverterSn', 'inverter_sn', 'sn']),
    inverterType: pick(raw, ['inverterType', 'inverter_type']),
    inverterStatus: pick(raw, ['inverterStatus', 'inverter_status', 'status']),
    uploadTime: pick(raw, ['uploadTime', 'upload_time', 'utcDateTime', 'utc_date_time']),
    utcDateTime: pick(raw, ['utcDateTime', 'utc_date_time']),

    acpower: toNumber(pick(raw, ['acpower', 'acPower', 'ac_power']), 0),
    yieldtoday: toNumber(pick(raw, ['yieldtoday', 'yieldToday', 'yield_today']), 0),
    yieldtotal: toNumber(pick(raw, ['yieldtotal', 'yieldTotal', 'yield_total']), 0),
    feedinpower: toNumber(pick(raw, ['feedinpower', 'feedInPower', 'feedin_power']), 0),
    feedinenergy: toNumber(pick(raw, ['feedinenergy', 'feedInEnergy', 'feedin_energy']), 0),
    consumeenergy: toNumber(pick(raw, ['consumeenergy', 'consumeEnergy', 'consume_energy']), 0),

    soc: toNumber(pick(raw, ['soc', 'SOC']), 0),
    batPower: toNumber(pick(raw, ['batPower', 'bat_power', 'batteryPower']), 0),

    powerdc1: toNumber(pick(raw, ['powerdc1', 'powerDc1', 'power_dc1']), 0),
    powerdc2: toNumber(pick(raw, ['powerdc2', 'powerDc2', 'power_dc2']), 0),
    powerdc3: toNumber(pick(raw, ['powerdc3', 'powerDc3', 'power_dc3']), 0),
    powerdc4: toNumber(pick(raw, ['powerdc4', 'powerDc4', 'power_dc4']), 0),

    lastFetched: new Date()
  };

  // Keep any extra fields for debugging/forward-compat, but prefer normalized keys above.
  return { ...raw, ...normalized };
}

function isWeatherLikeResponse(data) {
  return (
    data &&
    typeof data === 'object' &&
    (data.month !== undefined ||
      data.day !== undefined ||
      data.hour !== undefined ||
      data.airTemperature !== undefined ||
      data.windSpeed !== undefined)
  );
}

function isSolaxLikeUrl(apiUrl = '') {
  const u = apiUrl.toLowerCase();
  return u.includes('solaxcloud.com') || u.includes('global.solaxcloud');
}

/**
 * Fetch realtime data from either:
 * - Weather API (GET)
 * - SolaX Cloud realtime API (POST with wifiSn + tokenId)
 */
async function fetchRealtimeData(apiUrl, tokenId, wifiSN) {
  const url = String(apiUrl || '').trim();
  if (!url) {
    return { success: false, error: 'Missing apiUrl' };
  }

  const timeout = 15000;

  try {
    // Weather API: GET only
    if (url.toLowerCase().includes('solaxcloud.dynac.space')) {
      const r = await axios.get(url, { timeout });
      return { success: true, data: r.data };
    }

    // SolaX Cloud: POST preferred
    if (isSolaxLikeUrl(url)) {
      // 1) POST (preferred)
      try {
        const r = await axios.post(
          url,
          wifiSN ? { wifiSn: wifiSN } : {},
          {
            headers: {
              tokenId: tokenId,
              'Content-Type': 'application/json'
            },
            timeout
          }
        );

        if (r.data?.success && r.data?.result) return { success: true, data: r.data.result };
        if (r.data?.result) return { success: true, data: r.data.result };
        if (r.data && typeof r.data === 'object') return { success: true, data: r.data };
      } catch (e) {
        // fallthrough
      }

      // 2) GET (some gateways)
      try {
        const r = await axios.get(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(tokenId ? { tokenId } : {})
          },
          timeout
        });
        if (r.data?.success && r.data?.result) return { success: true, data: r.data.result };
        if (r.data && typeof r.data === 'object') return { success: true, data: r.data };
      } catch (e) {
        // fallthrough
      }
    }

    // Generic fallback: try GET then POST
    try {
      const r = await axios.get(url, {
        headers: { 'Content-Type': 'application/json', ...(tokenId ? { tokenId } : {}) },
        timeout
      });
      if (isWeatherLikeResponse(r.data)) return { success: true, data: r.data };
      if (r.data?.success && r.data?.result) return { success: true, data: r.data.result };
      if (r.data && typeof r.data === 'object') return { success: true, data: r.data };
    } catch (e) {
      // fallthrough
    }

    try {
      const r = await axios.post(
        url,
        wifiSN ? { wifiSn: wifiSN } : {},
        {
          headers: { tokenId: tokenId, 'Content-Type': 'application/json' },
          timeout
        }
      );
      if (r.data?.success && r.data?.result) return { success: true, data: r.data.result };
      if (r.data && typeof r.data === 'object') return { success: true, data: r.data };
    } catch (e) {
      return {
        success: false,
        error: e.response?.data?.message || e.response?.data?.exception || e.message || 'API request failed',
        status: e.response?.status
      };
    }

    return { success: false, error: 'Invalid API response format' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'API request failed',
      status: error.response?.status
    };
  }
}

module.exports = {
  fetchRealtimeData,
  normalizeRealtimeData,
  toNumber
};

