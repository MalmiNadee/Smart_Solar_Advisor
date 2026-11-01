const FaultHistory = require('../Models/FaultHistory');
const Device = require('../Models/Device');
const axios = require('axios');
const { buildUserIdQuery } = require('../utils/dbHelper');
const { fetchRealtimeData, normalizeRealtimeData, toNumber } = require('../utils/solaxApi');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://solaxcloud.dynac.space/api/v2/dataAccess/realtimeInfo/get';

const isDaytimeHour = (hour) => Number.isFinite(Number(hour)) && Number(hour) >= 6 && Number(hour) < 18;

// Fetch weather data from the real-time API
const fetchWeatherData = async () => {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      timeout: 10000
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Refresh device.latestData from its configured API (best-effort)
const refreshDeviceLatestData = async (device) => {
  try {
    if (!device?.apiUrl) {
      console.log('⚠️ refreshDeviceLatestData: Missing device apiUrl');
      return { success: false, error: 'Missing device apiUrl' };
    }

    console.log(`🔄 Refreshing device data for: ${device.deviceName} (${device.apiUrl})`);
    let r = await fetchRealtimeData(device.apiUrl, device.tokenId, device.wifiSN);
    
    // If API returned weather data or failed, try SolaX Cloud API as fallback
    const d = r.success ? r.data : null;
    const isWeatherLike =
      d &&
      typeof d === 'object' &&
      (d.month !== undefined || d.day !== undefined || d.hour !== undefined || d.airTemperature !== undefined);

    if (!r.success || isWeatherLike) {
      // Try SolaX Cloud API as fallback if we have wifiSN and tokenId (always try when we got weather or failed)
      if (device.wifiSN && device.tokenId) {
        console.log(`🔄 Trying SolaX Cloud API fallback...`);
        const solaxUrl = 'https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get';
        r = await fetchRealtimeData(solaxUrl, device.tokenId, device.wifiSN);
        
        if (r.success) {
          const fallbackData = r.data;
          const isFallbackWeather = fallbackData && typeof fallbackData === 'object' &&
            (fallbackData.month !== undefined || fallbackData.day !== undefined);
          
          if (!isFallbackWeather) {
            console.log(`✅ Fallback API returned device data`);
            const normalized = normalizeRealtimeData(fallbackData);
            device.latestData = normalized;
            device.status = 'active';
            await device.save();
            return { success: true };
          }
        }
      }
      
      if (!r.success) {
        console.log(`❌ Device refresh failed: ${r.error}`);
        return r;
      }
      
      if (isWeatherLike) {
        console.log(`⚠️ API returned weather data, not device data. Device may need different API URL.`);
        // Don't update device data if it's weather data
        return { success: false, error: 'API returned weather data instead of device data' };
      }
    }

    // Normalize and save device data
    const normalized = normalizeRealtimeData(r.data);
    console.log(`✅ Normalized device data:`, {
      acpower: normalized.acpower,
      yieldtoday: normalized.yieldtoday,
      yieldtotal: normalized.yieldtotal,
      inverterSN: normalized.inverterSN || 'N/A',
      hasData: normalized.acpower > 0 || normalized.yieldtoday > 0
    });
    
    device.latestData = normalized;
    device.status = 'active';
    await device.save();
    console.log(`💾 Device data saved successfully`);
    
    return { success: true };
  } catch (e) {
    console.error(`❌ Error refreshing device data:`, e.message);
    return { success: false, error: e.message };
  }
};

// Call ML service for prediction only (used to recompute predictedProduction for history records)
const getPredictedProductionFromML = async (weatherData) => {
  try {
    const mlPayload = {
      Hour: weatherData.hour,
      Day: weatherData.day,
      Month: weatherData.month,
      WindSpeed: weatherData.windSpeed ?? 10,
      Sunshine: weatherData.sunshine ?? 50,
      AirPressure: weatherData.airPressure ?? 1010,
      Radiation: weatherData.radiation ?? 100,
      AirTemperature: weatherData.airTemperature ?? 25,
      RelativeAirHumidity: weatherData.relativeAirHumidity ?? 60
    };
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, mlPayload, { timeout: 5000 });
    if (response.data.success && response.data.predictedSystemProduction != null) {
      return response.data.predictedSystemProduction;
    }
  } catch (e) {
    console.warn('Recompute prediction failed:', e.message);
  }
  return null;
};

// Call ML service for fault detection
const detectFaultWithML = async (weatherData, actualProduction) => {
  try {
    const mlPayload = {
      Hour: weatherData.hour,
      Day: weatherData.day,
      Month: weatherData.month,
      WindSpeed: weatherData.windSpeed,
      Sunshine: weatherData.sunshine,
      AirPressure: weatherData.airPressure,
      Radiation: weatherData.radiation,
      AirTemperature: weatherData.airTemperature,
      RelativeAirHumidity: weatherData.relativeAirHumidity,
      actualProduction: actualProduction
    };

    const response = await axios.post(`${ML_SERVICE_URL}/detect-fault`, mlPayload, {
      timeout: 15000
    });

    if (response.data.success) {
      return {
        success: true,
        prediction: response.data.prediction
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'ML service error'
      };
    }
  } catch (error) {
    console.error('Error calling ML service:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Detect fault for a device
exports.detectFault = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, ...buildUserIdQuery(userId) });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Always refresh device data first so Actual Production is real (not 0/N/A)
    const refreshResult = await refreshDeviceLatestData(device);
    if (!refreshResult.success) {
      console.log(`⚠️ Device refresh failed, but continuing with existing data: ${refreshResult.error}`);
    }

    // Reload device from DB to get fresh latestData
    await device.populate();
    const freshDevice = await Device.findById(device._id);
    
    // Fetch weather data
    const weatherResult = await fetchWeatherData();
    if (!weatherResult.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch weather data: ${weatherResult.error}`
      });
    }

    const weatherData = weatherResult.data;
    const actualProduction = toNumber(freshDevice?.latestData?.acpower || device.latestData?.acpower, 0);
    
    console.log(`📊 Fault detection inputs:`, {
      actualProduction,
      deviceHasData: !!freshDevice?.latestData || !!device.latestData,
      acpower: freshDevice?.latestData?.acpower || device.latestData?.acpower,
      hour: weatherData.hour || new Date().getHours()
    });

    // Map weather data to ML service format (handle different API response structures)
    const mappedWeatherData = {
      hour: weatherData.hour || new Date().getHours(),
      day: weatherData.day || new Date().getDate(),
      month: weatherData.month || new Date().getMonth() + 1,
      windSpeed: weatherData.windSpeed || 0,
      sunshine: weatherData.sunshine || 0,
      airPressure: weatherData.airPressure || 1010,
      radiation: weatherData.radiation || 0,
      airTemperature: weatherData.airTemperature || 25,
      relativeAirHumidity: weatherData.relativeAirHumidity || 60
    };

    // Night-time: solar production expected to be ~0 (do not mark as fault, and do not spam history)
    if (!isDaytimeHour(mappedWeatherData.hour)) {
      return res.status(200).json({
        success: true,
        faultDetection: {
          predictedProduction: 0,
          actualProduction: 0,
          faultDetected: false,
          faultType: 'none',
          faultSeverity: 'none',
          deviation: 0,
          isDaytime: false
        },
        weatherData: {
          ...mappedWeatherData,
          minute: weatherData.minute || new Date().getMinutes(),
          last_updated: weatherData.last_updated || new Date().toISOString()
        },
        timestamp: new Date()
      });
    }

    // Call ML service for fault detection
    console.log(`🤖 Calling ML service with:`, {
      Hour: mappedWeatherData.hour,
      Radiation: mappedWeatherData.radiation,
      Sunshine: mappedWeatherData.sunshine,
      AirTemperature: mappedWeatherData.airTemperature,
      actualProduction
    });
    
    const mlResult = await detectFaultWithML(mappedWeatherData, actualProduction);
    if (!mlResult.success) {
      console.error(`❌ ML service error:`, mlResult.error);
      return res.status(500).json({
        success: false,
        message: `ML service error: ${mlResult.error}`
      });
    }
    
    console.log(`✅ ML prediction result:`, {
      predictedProduction: mlResult.prediction.predictedProduction,
      actualProduction: mlResult.prediction.actualProduction,
      deviation: mlResult.prediction.deviation,
      faultDetected: mlResult.prediction.faultDetected
    });

      // Save to history
      const faultRecord = new FaultHistory({
        deviceId,
        userId,
        timestamp: new Date(),
        weatherData: {
          month: mappedWeatherData.month,
          day: mappedWeatherData.day,
          hour: mappedWeatherData.hour,
          minute: weatherData.minute || new Date().getMinutes(),
          windSpeed: mappedWeatherData.windSpeed,
          sunshine: mappedWeatherData.sunshine,
          airPressure: mappedWeatherData.airPressure,
          radiation: mappedWeatherData.radiation,
          airTemperature: mappedWeatherData.airTemperature,
          relativeAirHumidity: mappedWeatherData.relativeAirHumidity,
          last_updated: weatherData.last_updated || new Date().toISOString()
        },
      solarData: {
        acpower: toNumber(freshDevice?.latestData?.acpower || device.latestData?.acpower, 0),
        yieldtoday: toNumber(freshDevice?.latestData?.yieldtoday || device.latestData?.yieldtoday, 0),
        yieldtotal: toNumber(freshDevice?.latestData?.yieldtotal || device.latestData?.yieldtotal, 0),
        consumeenergy: toNumber(freshDevice?.latestData?.consumeenergy || device.latestData?.consumeenergy, 0),
        inverterSN: freshDevice?.latestData?.inverterSN || device.latestData?.inverterSN || '',
        inverterType: freshDevice?.latestData?.inverterType || device.latestData?.inverterType || '',
        inverterStatus: freshDevice?.latestData?.inverterStatus || device.latestData?.inverterStatus || '',
        batPower: toNumber(freshDevice?.latestData?.batPower || device.latestData?.batPower, 0),
        soc: toNumber(freshDevice?.latestData?.soc || device.latestData?.soc, 0)
      },
      prediction: mlResult.prediction
    });

    await faultRecord.save();

    res.status(200).json({
      success: true,
      faultDetection: mlResult.prediction,
      weatherData: {
        ...mappedWeatherData,
        minute: weatherData.minute || new Date().getMinutes(),
        last_updated: weatherData.last_updated || new Date().toISOString()
      },
      timestamp: faultRecord.timestamp
    });
  } catch (error) {
    console.error('Fault detection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during fault detection'
    });
  }
};

// Get fault history for a device
exports.getFaultHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, ...buildUserIdQuery(userId) });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    let query = { deviceId, userId };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Fetch raw records for the day, then dedupe to 5-minute buckets (one record per time)
    const raw = await FaultHistory.find(query)
      .sort({ timestamp: 1 })
      .limit(2000);

    const daytimeOnly = raw.filter((r) => {
      const h = r.weatherData?.hour ?? new Date(r.timestamp).getHours();
      return isDaytimeHour(h);
    });

    // Bucket to 5-minute intervals
    const bucketMap = new Map();
    for (const r of daytimeOnly) {
      const t = new Date(r.timestamp);
      t.setSeconds(0, 0);
      t.setMinutes(Math.floor(t.getMinutes() / 5) * 5);
      const key = t.toISOString();
      bucketMap.set(key, r); // overwrite -> keep latest in that 5-min bucket
    }

    let history = Array.from(bucketMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 288); // up to 288 records/day at 5-min intervals

    // Recompute predictedProduction for records that have 0 (from old ML responses)
    const needsRecompute = history.filter(r => !r.prediction?.predictedProduction && r.weatherData);
    if (needsRecompute.length > 0) {
      const recomputed = await Promise.all(needsRecompute.map(async (r) => {
        const w = r.weatherData;
        const pred = await getPredictedProductionFromML({
          hour: w.hour ?? new Date(r.timestamp).getHours(),
          day: w.day ?? new Date(r.timestamp).getDate(),
          month: w.month ?? new Date(r.timestamp).getMonth() + 1,
          windSpeed: w.windSpeed ?? 10,
          sunshine: w.sunshine ?? 50,
          airPressure: w.airPressure ?? 1010,
          radiation: w.radiation ?? 100,
          airTemperature: w.airTemperature ?? 25,
          relativeAirHumidity: w.relativeAirHumidity ?? 60
        });
        return pred != null ? { ...r.toObject(), prediction: { ...r.prediction, predictedProduction: pred } } : r;
      }));
      const recomputedMap = new Map(recomputed.map(h => [h._id.toString(), h]));
      history = history.map(h => recomputedMap.get(h._id.toString()) || h);
    }

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Get fault history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault history'
    });
  }
};

// Get all fault history for user
exports.getAllFaultHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 100 } = req.query;

    let query = { userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await FaultHistory.find(query)
      .populate('deviceId', 'deviceName wifiSN')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Get all fault history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault history'
    });
  }
};

// Get forecast
exports.getForecast = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hoursAhead = 24 } = req.query;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, ...buildUserIdQuery(userId) });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Fetch current weather data
    const weatherResult = await fetchWeatherData();
    if (!weatherResult.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch weather data: ${weatherResult.error}`
      });
    }

    const currentWeather = weatherResult.data;
    console.log(`🌤️ Current weather for forecast:`, {
      windSpeed: currentWeather.windSpeed,
      airPressure: currentWeather.airPressure,
      humidity: currentWeather.relativeAirHumidity,
      hour: currentWeather.hour || new Date().getHours()
    });

    // Prepare forecast request with realistic current weather values
    const forecastPayload = {
      hoursAhead: parseInt(hoursAhead),
      currentWindSpeed: toNumber(currentWeather.windSpeed, 10),
      currentAirPressure: toNumber(currentWeather.airPressure, 1010),
      currentHumidity: toNumber(currentWeather.relativeAirHumidity, 60),
      weatherForecast: [] // ML service will generate realistic estimates
    };

    console.log(`📡 Calling ML forecast service with:`, forecastPayload);

    // Call ML service for forecast
    const response = await axios.post(`${ML_SERVICE_URL}/forecast`, forecastPayload, {
      timeout: 30000
    });

    if (response.data.success) {
      const forecasts = Array.isArray(response.data.forecasts) ? response.data.forecasts : [];
      console.log(`📊 ML service returned ${forecasts.length} forecast points`);
      
      const daytimeForecasts = forecasts
        .filter((f) => {
          const h = f.hour ?? new Date(f.timestamp).getHours();
          return isDaytimeHour(h);
        })
        .map((f) => {
          const prod = toNumber(f.predictedProduction, 0);
          console.log(`  Hour ${f.hour}: ${prod} W (Radiation: ${f.weather?.Radiation || 'N/A'}, Sunshine: ${f.weather?.Sunshine || 'N/A'})`);
          return {
            ...f,
            predictedProduction: prod
          };
        });

      console.log(`✅ Returning ${daytimeForecasts.length} daytime forecasts`);

      res.status(200).json({
        success: true,
        forecasts: daytimeForecasts
      });
    } else {
      console.error(`❌ ML forecast service error:`, response.data.error);
      res.status(500).json({
        success: false,
        message: response.data.error || 'Forecast failed'
      });
    }
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during forecast'
    });
  }
};

// Get latest fault status for a device
exports.getLatestFaultStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, ...buildUserIdQuery(userId) });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const latestFault = await FaultHistory.findOne({ deviceId, userId })
      .sort({ timestamp: -1 });

    if (!latestFault) {
      return res.status(200).json({
        success: true,
        hasHistory: false,
        message: 'No fault history found'
      });
    }

    res.status(200).json({
      success: true,
      hasHistory: true,
      latestFault: {
        timestamp: latestFault.timestamp,
        faultDetected: latestFault.prediction.faultDetected,
        faultType: latestFault.prediction.faultType,
        faultSeverity: latestFault.prediction.faultSeverity,
        predictedProduction: latestFault.prediction.predictedProduction,
        actualProduction: latestFault.prediction.actualProduction,
        deviation: latestFault.prediction.deviation
      }
    });
  } catch (error) {
    console.error('Get latest fault status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault status'
    });
  }
};
