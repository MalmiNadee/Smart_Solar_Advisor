import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Battery, Home, Zap, RefreshCw, AlertTriangle, CheckCircle, Activity, Server } from 'lucide-react';
import axios from "axios";
import Layout from './components/Layout';

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const today = new Date();

  // Directly display the value with the given unit
  const getPowerDisplay = (value) => {
    if (value === null || value === undefined) return '--';
    if (value > 1000) {
      return { value: value / 1000, unit: 'kW' };
    } else {
      return { value, unit: 'W' };
    }
  };

  const formattedToday = today.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(",", " |");

  const getNextDay = (offset) => {
    const d = new Date();
    d.setDate(today.getDate() + offset);
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  const day1 = getNextDay(1);
  const day2 = getNextDay(2);

  const [solarData, setSolarData] = useState({
    acpower: 0,
    yieldtoday: 0,
    yieldtotal: 0,
    consumeenergy: 0,
    inverterSN: null,
    sn: null,
    inverterType: null,
    inverterStatus: null,
    uploadTime: null,
    batPower: 0,
    powerdc1: 0,
    powerdc2: 0,
    powerdc3: 0,
    powerdc4: 0,
    soc: 0
  });
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [faultStatus, setFaultStatus] = useState(null);


  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSolarData({
          acpower: 0,
          yieldtoday: 0,
          yieldtotal: 0,
          consumeenergy: 0,
          inverterSN: null,
          sn: null,
          inverterType: null,
          inverterStatus: null,
          uploadTime: null,
          batPower: 0,
          powerdc1: 0,
          powerdc2: 0,
          powerdc3: 0,
          powerdc4: 0,
          soc: 0
        });
        setDevices([]);
        setSelectedDevice(null);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('App.js - Devices response:', response.data);
      console.log('App.js - Devices count:', response.data?.count);
      console.log('App.js - Devices array:', response.data?.devices);

      if (response.data.success) {
        const deviceList = Array.isArray(response.data.devices) ? response.data.devices : [];
        console.log('App.js - Setting devices:', deviceList.length);
        console.log('App.js - Is array?', Array.isArray(deviceList));

        if (deviceList.length > 0) {
          console.log('App.js - First device:', deviceList[0]);
        }

        setDevices(deviceList);

        if (response.data.devices.length > 0) {
          const firstDevice = response.data.devices[0];
          setSelectedDevice(firstDevice);

          if (firstDevice.latestData) {
            setSolarData({
              acpower: firstDevice.latestData.acpower || 0,
              yieldtoday: firstDevice.latestData.yieldtoday || 0,
              yieldtotal: firstDevice.latestData.yieldtotal || 0,
              consumeenergy: firstDevice.latestData.consumeenergy || 0,
              inverterSN: firstDevice.latestData.inverterSN || null,
              sn: firstDevice.wifiSN || null,
              inverterType: firstDevice.latestData.inverterType || null,
              inverterStatus: firstDevice.latestData.inverterStatus || null,
              uploadTime: firstDevice.latestData.uploadTime || null,
              batPower: firstDevice.latestData.batPower || 0,
              powerdc1: firstDevice.latestData.powerdc1 || 0,
              powerdc2: firstDevice.latestData.powerdc2 || 0,
              powerdc3: firstDevice.latestData.powerdc3 || 0,
              powerdc4: firstDevice.latestData.powerdc4 || 0,
              soc: firstDevice.latestData.soc || 0
            });
          } else {
            // Device exists but no data yet
            setSolarData({
              acpower: 0,
              yieldtoday: 0,
              yieldtotal: 0,
              consumeenergy: 0,
              inverterSN: null,
              sn: firstDevice.wifiSN || null,
              inverterType: null,
              inverterStatus: null,
              uploadTime: null,
              batPower: 0,
              powerdc1: 0,
              powerdc2: 0,
              powerdc3: 0,
              powerdc4: 0,
              soc: 0
            });
          }
        } else {
          // No devices, reset to zero values
          setSolarData({
            acpower: 0,
            yieldtoday: 0,
            yieldtotal: 0,
            consumeenergy: 0,
            inverterSN: null,
            sn: null,
            inverterType: null,
            inverterStatus: null,
            uploadTime: null,
            batPower: 0,
            powerdc1: 0,
            powerdc2: 0,
            powerdc3: 0,
            powerdc4: 0,
            soc: 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      // On error, reset to zero values
      setSolarData({
        acpower: 0,
        yieldtoday: 0,
        yieldtotal: 0,
        consumeenergy: 0,
        inverterSN: null,
        sn: null,
        inverterType: null,
        inverterStatus: null,
        uploadTime: null,
        batPower: 0,
        powerdc1: 0,
        powerdc2: 0,
        powerdc3: 0,
        powerdc4: 0,
        soc: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardRefresh = async () => {
    // Need a selected device to refresh
    if (!selectedDevice || !selectedDevice._id) return;

    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');

      // Call the same refresh endpoint used in AddDevice.js
      await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/devices/${selectedDevice._id}/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // After refreshing on the backend, pull latest data
      await fetchDevices();
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };


  /* New function to fetch live data from the proxy route */
  const fetchLiveSolaxData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/solax/realtime`);
      console.log('Live Solax Data:', response.data);

      if (response.data && response.data.success && response.data.result) {
        const liveData = response.data.result;

        // Map Solax API response to valid state structure
        // Note: Field names from Solax API might differ, adjusting based on common patterns or result object
        // Assuming result structure: { acpower, yieldtoday, yieldtotal, ... } or needs mapping
        // If exact fields are unknown, we map what looks standard.
        // Assuming Solax returns: acpower, yieldtoday, yieldtotal, inverterType, inverterStatus, uploadTime, batPower, etc.

        setSolarData(prev => ({
          ...prev,
          acpower: liveData.acpower || 0,
          yieldtoday: liveData.yieldtoday || 0,
          yieldtotal: liveData.yieldtotal || 0,
          consumeenergy: liveData.consumeenergy || 0,
          inverterSN: liveData.inverterSN || prev.inverterSN,
          sn: liveData.sn || prev.sn, // or check if result has 'sn'
          inverterType: liveData.inverterType || prev.inverterType,
          inverterStatus: liveData.inverterStatus || prev.inverterStatus,
          uploadTime: liveData.uploadTime || prev.uploadTime,
          batPower: liveData.batPower || 0,
          powerdc1: liveData.powerdc1 || 0,
          powerdc2: liveData.powerdc2 || 0,
          powerdc3: liveData.powerdc3 || 0,
          powerdc4: liveData.powerdc4 || 0,
          soc: liveData.soc || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch live Solax data:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (token && userEmail) {
      setIsLoggedIn(true);
      setUsername(userEmail);
    }

    fetchDevices();
    fetchLiveSolaxData(); // Initial fetch
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      fetchDevices();
      fetchLiveSolaxData(); // Periodic fetch
      if (selectedDevice) {
        fetchFaultStatus();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isLoggedIn, selectedDevice]);

  useEffect(() => {
    if (selectedDevice && isLoggedIn) {
      fetchFaultStatus();
    }
  }, [selectedDevice, isLoggedIn]);

  const fetchFaultStatus = async () => {
    if (!selectedDevice) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/faults/detect/${selectedDevice._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setFaultStatus(response.data.faultDetection);
      }
    } catch (error) {
      console.error('Failed to fetch fault status:', error);
    }
  };

  const handleLogin = () => navigate('/login');

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');

    setSolarData({
      acpower: 0,
      yieldtoday: 0,
      yieldtotal: 0,
      consumeenergy: 0,
      inverterSN: null,
      sn: null,
      inverterType: null,
      inverterStatus: null,
      uploadTime: null,
      batPower: 0,
      powerdc1: 0,
      powerdc2: 0,
      powerdc3: 0,
      powerdc4: 0,
      soc: 0
    });
    setDevices([]);
    setSelectedDevice(null);
    navigate('/login');
  };

  const acPower = getPowerDisplay(solarData.acpower);

  const getStatusText = (status) => {
    const statusMap = {
      '102': 'Offline',
      '0': 'Standby',
      '1': 'Normal',
      '2': 'Fault'
    };
    return statusMap[status] || 'Unknown';
  };

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading device data...</p>
            </div>
          ) : (
            <>
              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Left Panel - PV Power Meter */}
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
                  {/* Top-right refresh icon */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleDashboardRefresh}
                      disabled={isRefreshing}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      title="Refresh data"
                    >
                      <RefreshCw
                        className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    {/* Semicircle Power Meter */}
                    <div className="relative w-72 h-48 mb-4">
                      <svg className="w-72 h-48" viewBox="0 0 280 140">
                        <defs>
                          {/* Gradient for gauge track */}
                          <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                          </linearGradient>

                          {/* Shadow filter */}
                          <filter id="shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                          </filter>

                          {/* Gradient for background arc */}
                          <linearGradient id="bgArc" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f1f5f9" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                          </linearGradient>
                        </defs>

                        {/* Background semicircle with gradient */}
                        <path
                          d="M 24 128 A 112 112 0 0 1 256 128"
                          fill="none"
                          stroke="url(#bgArc)"
                          strokeWidth="14"
                          strokeLinecap="round"
                          filter="url(#shadow)"
                        />

                        {/* Colored zone indicators */}
                        {[...Array(6)].map((_, i) => {
                          const startAngle = Math.PI - ((i + 1) * Math.PI / 6);
                          const endAngle = Math.PI - (i * Math.PI / 6);
                          const startX = 140 + 112 * Math.cos(startAngle);
                          const startY = 128 - 112 * Math.sin(startAngle);
                          const endX = 140 + 112 * Math.cos(endAngle);
                          const endY = 128 - 112 * Math.sin(endAngle);
                          const largeArc = 0;
                          const color = i < 2 ? '#10b981' : i < 4 ? '#fbbf24' : '#ef4444';
                          return (
                            <path
                              key={`zone-${i}`}
                              d={`M ${startX} ${startY} A 112 112 0 ${largeArc} 1 ${endX} ${endY}`}
                              fill="none"
                              stroke={color}
                              strokeWidth="14"
                              strokeLinecap="round"
                              opacity="0.3"
                            />
                          );
                        })}

                        {/* Main divisions (6 parts) - thicker and more visible */}
                        {[...Array(7)].map((_, i) => {
                          const angle = Math.PI - (i * Math.PI / 6);
                          const x1 = 140 + 112 * Math.cos(angle);
                          const y1 = 128 - 112 * Math.sin(angle);
                          const x2 = 140 + 98 * Math.cos(angle);
                          const y2 = 128 - 98 * Math.sin(angle);
                          return (
                            <line
                              key={`main-${i}`}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#475569"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          );
                        })}

                        {/* Subdivisions (10 parts per main division = 60 total) */}
                        {[...Array(61)].map((_, i) => {
                          if (i % 10 === 0) return null; // Skip main divisions
                          const angle = Math.PI - (i * Math.PI / 60);
                          const x1 = 140 + 112 * Math.cos(angle);
                          const y1 = 128 - 112 * Math.sin(angle);
                          const x2 = 140 + 105 * Math.cos(angle);
                          const y2 = 128 - 105 * Math.sin(angle);
                          return (
                            <line
                              key={`sub-${i}`}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#94a3b8"
                              strokeWidth="2"
                              strokeLinecap="round"
                              opacity="0.7"
                            />
                          );
                        })}

                        {/* Progress arc with gradient */}
                        {(() => {
                          const powerValue = Math.min(solarData.acpower / 1000, 6);
                          const angle = Math.PI - (powerValue / 6) * Math.PI;
                          const endX = 140 + 112 * Math.cos(angle);
                          const endY = 128 - 112 * Math.sin(angle);
                          return (
                            <path
                              d={`M 24 128 A 112 112 0 0 1 ${endX} ${endY}`}
                              fill="none"
                              stroke="url(#gaugeTrack)"
                              strokeWidth="14"
                              strokeLinecap="round"
                              style={{
                                filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))',
                                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            />
                          );
                        })()}

                        {/* Needle */}
                        {(() => {
                          const powerValue = Math.min(solarData.acpower / 1000, 6);
                          const angle = Math.PI - (powerValue / 6) * Math.PI;
                          const needleLength = 85;
                          const x = 140 + needleLength * Math.cos(angle);
                          const y = 128 - needleLength * Math.sin(angle);

                          // Calculate needle polygon (arrow shape)
                          const perpAngle = angle + Math.PI / 2;
                          const tipX = x;
                          const tipY = y;
                          const baseX = 140;
                          const baseY = 128;
                          const width = 6;
                          const p1x = baseX + width * Math.cos(perpAngle);
                          const p1y = baseY + width * Math.sin(perpAngle);
                          const p2x = baseX - width * Math.cos(perpAngle);
                          const p2y = baseY - width * Math.sin(perpAngle);
                          const p3x = tipX - 3 * Math.cos(angle);
                          const p3y = tipY + 3 * Math.sin(angle);

                          return (
                            <g>
                              {/* Needle shadow */}
                              <polygon
                                points={`${p1x + 2},${p1y + 2} ${p2x + 2},${p2y + 2} ${p3x + 2},${p3y + 2}`}
                                fill="#000000"
                                opacity="0.2"
                              />
                              {/* Needle body */}
                              <polygon
                                points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`}
                                fill="#1e293b"
                                style={{
                                  transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              />
                              {/* Needle center hub */}
                              <circle cx="140" cy="128" r="8" fill="#ffffff" stroke="#1e293b" strokeWidth="2" filter="url(#shadow)" />
                              <circle cx="140" cy="128" r="4" fill="#3b82f6" />
                            </g>
                          );
                        })()}

                        {/* Labels for 6 main divisions */}
                        {[...Array(7)].map((_, i) => {
                          const angle = Math.PI - (i * Math.PI / 6);
                          const x = 140 + 85 * Math.cos(angle);
                          const y = 128 - 85 * Math.sin(angle);
                          return (
                            <text
                              key={`label-${i}`}
                              x={x}
                              y={y + 5}
                              textAnchor="middle"
                              className="text-sm font-bold fill-slate-700"
                              style={{ fontFamily: 'Arial, sans-serif' }}
                            >
                              {i}
                            </text>
                          );
                        })}

                        {/* Unit label */}
                        <text
                          x="140"
                          y="120"
                          textAnchor="middle"
                          className="text-xs font-semibold fill-slate-500"
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          kW
                        </text>
                      </svg>
                    </div>

                    {/* Power value display below meter */}
                    <div className="text-center mt-2">
                      <div className="text-5xl font-bold text-slate-800 mb-1">{acPower.value}</div>
                      <div className="text-slate-500 text-xl font-medium">{acPower.unit}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-700">PV Power</div>
                      <div className="text-sm text-slate-500 mt-1 bg-slate-100 px-3 py-1 rounded-full inline-block">
                        PV Capacity: 6.00 kWp
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="text-xs font-medium text-blue-600 mb-1">Daily Yield</div>
                      <div className="text-2xl font-bold text-slate-800">{solarData.yieldtoday.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">kWh</div>
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-blue-200">
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                      <div className="text-xs font-medium text-slate-600 mb-1">Daily Yield Total</div>
                      <div className="text-2xl font-bold text-slate-800">{solarData.yieldtotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">kWh</div>
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200"></div>
                    </div>
                  </div>
                </div>

                {/* Center Panel - Energy Flow Visualization */}
                <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 rounded-2xl shadow-md p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Energy Flow</h2>
                  </div>

                  <div className="relative h-96">
                    {/* Solar Panels - Top */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                        <Sun className="w-10 h-10 text-white" />
                      </div>
                      <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                        <div className="text-sm font-bold text-slate-800">
                          {(solarData.acpower / 1000).toFixed(2)} kW
                        </div>
                        <div className="text-xs text-slate-500">Solar</div>
                      </div>
                    </div>

                    {/* Inverter - Center */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl border-4 border-white">
                        <Zap className="w-12 h-12 text-white" />
                      </div>
                      <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                        <div className="text-sm font-bold text-slate-800">--</div>
                        <div className="text-xs text-slate-500">Inverter</div>
                      </div>
                    </div>

                    {/* Battery - Right */}
                    <div className="absolute top-1/4 right-4 transform -translate-y-1/2 text-center">
                      <div className="w-16 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                        <Battery className="w-8 h-8 text-white" />
                      </div>
                      <div className="mt-2 text-xs text-slate-600 font-medium">Battery</div>
                    </div>

                    {/* Home - Bottom Left */}
                    <div className="absolute bottom-8 left-1/4 transform -translate-x-1/2 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                        <Home className="w-10 h-10 text-white" />
                      </div>
                      <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                        {/* <div className="text-sm font-bold text-slate-800">-- W</div> */}
                        <div className="text-xs text-slate-500">Home</div>
                      </div>
                    </div>

                    {/* Grid - Bottom Right */}
                    <div className="absolute bottom-8 right-1/4 transform translate-x-1/2 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                        <Server className="w-10 h-10 text-white" />
                      </div>
                      <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                        {/* <div className="text-sm font-bold text-slate-800">-- W</div> */}
                        <div className="text-xs text-slate-500">Grid</div>
                      </div>
                    </div>

                    {/* Animated Connecting Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>
                      <line x1="50%" y1="22%" x2="50%" y2="43%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                      </line>
                      <line x1="50%" y1="57%" x2="28%" y2="72%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                      </line>
                      <line x1="50%" y1="57%" x2="72%" y2="72%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                      </line>
                      <line x1="58%" y1="50%" x2="78%" y2="50%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                      </line>
                    </svg>
                  </div>
                </div>

                {/* Right Panel - Device Information */}
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
                  {/* Fault Status Alert */}
                  {faultStatus && (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${faultStatus.faultDetected
                        ? faultStatus.faultSeverity === 'high'
                          ? 'bg-red-50 border-red-300'
                          : faultStatus.faultSeverity === 'medium'
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-yellow-50 border-yellow-300'
                        : 'bg-green-50 border-green-300'
                      }`}>
                      <div className="flex items-center gap-3">
                        {faultStatus.faultDetected ? (
                          <AlertTriangle className={`w-6 h-6 ${faultStatus.faultSeverity === 'high' ? 'text-red-600' :
                              faultStatus.faultSeverity === 'medium' ? 'text-orange-600' :
                                'text-yellow-600'
                            }`} />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">
                            {faultStatus.faultDetected ? 'Fault Detected' : 'System Normal'}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {faultStatus.faultDetected
                              ? `Type: ${faultStatus.faultType.replace('_', ' ').toUpperCase()} | Severity: ${faultStatus.faultSeverity.toUpperCase()}`
                              : 'No faults detected'}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Deviation: {faultStatus.deviation > 0 ? '+' : ''}{faultStatus.deviation.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                    Device Information
                  </h2>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <div className="text-xs font-medium text-slate-500 mb-1">Inverter SN</div>
                      <div className="text-sm font-semibold text-slate-800">{solarData.inverterSN || '--'}</div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <div className="text-xs font-medium text-slate-500 mb-1">Wi-Fi Module SN</div>
                      <div className="text-sm font-semibold text-slate-800">{solarData.sn || '--'}</div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">AC Output Power</div>
                      <div className="text-lg font-bold text-slate-800">{solarData.acpower} W
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <div className="text-xs font-medium text-slate-500 mb-1">Inverter Type</div>
                      <div className="text-sm font-semibold text-slate-800">{solarData.inverterType ? `Type ${solarData.inverterType}` : '--'}</div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <div className="text-xs font-medium text-slate-500 mb-1">Inverter Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${solarData.inverterStatus === '102' || !solarData.inverterStatus ? 'bg-slate-400' : solarData.inverterStatus === '1' ? 'bg-green-500' : 'bg-yellow-500'} shadow-lg`}></div>
                        <div className="text-sm font-semibold text-slate-800">{solarData.inverterStatus ? getStatusText(solarData.inverterStatus) : '--'}</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <div className="text-xs font-medium text-slate-500 mb-1">Upload Time</div>
                      <div className="text-sm font-semibold text-slate-800">{solarData.uploadTime || '--'}</div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                      <div className="text-xs font-medium text-green-600 mb-1">Battery Power</div>
                      <div className="text-lg font-bold text-slate-800">{solarData.batPower} W</div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-500 mb-3">PV Input Power</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-2.5 border border-blue-300">
                          <div className="text-xs text-blue-700 font-medium">PV1</div>
                          <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc1} W</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-2.5 border border-blue-300">
                          <div className="text-xs text-blue-700 font-medium">PV2</div>
                          <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc2} W</div>
                        </div>
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-2.5 border border-slate-300">
                          <div className="text-xs text-slate-600 font-medium">PV3</div>
                          <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc3} W</div>
                        </div>
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-2.5 border border-slate-300">
                          <div className="text-xs text-slate-600 font-medium">PV4</div>
                          <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc4} W</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                      <div className="text-xs font-medium text-green-600 mb-1">Battery SOC</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-lg font-bold text-slate-800">{solarData.soc}</div>
                        <div className="text-sm text-slate-600">%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </Layout>
  );
}

export default App;