import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Activity, AlertTriangle, Cpu } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function Forecast() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [hoursAhead, setHoursAhead] = useState(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoggedIn(true);
    setUsername(userEmail || 'User');
    fetchDevices();
  }, [navigate]);

  useEffect(() => {
    if (selectedDevice) fetchForecast();
  }, [selectedDevice, hoursAhead]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/devices?refresh=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.devices) {
        setDevices(response.data.devices);

        if (response.data.devices.length > 0 && !selectedDevice) {
          setSelectedDevice(response.data.devices[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const fetchForecast = async () => {
    if (!selectedDevice) return;

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/faults/forecast/${selectedDevice._id}?hoursAhead=${hoursAhead}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setForecasts(response.data.forecasts || []);
      }
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMaxProduction = () => {
    if (!forecasts.length) return 0;
    return Math.max(...forecasts.map(f => f.predictedProduction));
  };

  const getAverageProduction = () => {
    if (!forecasts.length) return 0;
    const sum = forecasts.reduce((acc, f) => acc + f.predictedProduction, 0);
    return sum / forecasts.length;
  };

  const maxProduction = getMaxProduction();
  const avgProduction = getAverageProduction();

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const chartData = forecasts.map((f) => ({
    time: formatTime(f.timestamp),
    production: (f.predictedProduction / 1000).toFixed(2)
  }));

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              Solar Production Forecast
            </h1>
            <p className="text-slate-500">AI predicted solar energy generation</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 grid md:grid-cols-2 gap-6">

          <div>
            <label className="text-sm font-medium">Device</label>
            <select
              value={selectedDevice?._id || ''}
              onChange={(e) => {
                const device = devices.find(d => d._id === e.target.value);
                setSelectedDevice(device);
              }}
              className="w-full border rounded-lg px-4 py-2 mt-1"
            >
              {devices.map(d => (
                <option key={d._id} value={d._id}>
                  {d.deviceName} ({d.wifiSN})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Forecast Range</label>
            <select
              value={hoursAhead}
              onChange={(e) => setHoursAhead(parseInt(e.target.value))}
              className="w-full border rounded-lg px-4 py-2 mt-1"
            >
              <option value={6}>6 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>

        </div>

        {/* Device Info */}
        {selectedDevice && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex items-center gap-4">
            <Cpu className="text-blue-600" />
            <div>
              <div className="font-semibold">{selectedDevice.deviceName}</div>
              <div className="text-sm text-slate-500">
                Serial: {selectedDevice.wifiSN}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {forecasts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-6">

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-500">Peak Production</div>
              <div className="text-3xl font-bold text-blue-600">
                {(maxProduction / 1000).toFixed(2)} kW
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-500">Average Production</div>
              <div className="text-3xl font-bold text-green-600">
                {(avgProduction / 1000).toFixed(2)} kW
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-500">Forecast Points</div>
              <div className="text-3xl font-bold text-purple-600">
                {forecasts.length}
              </div>
            </div>

          </div>
        )}

        {/* Chart */}
        {forecasts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">

            <h2 className="text-lg font-semibold mb-4">
              Energy Production Forecast
            </h2>

            <div className="h-80">

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>

                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>

                    <filter id="shadow">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#2563eb"/>
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>

                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />

                  <YAxis
                    stroke="#64748b"
                    label={{
                      value: "kW",
                      angle: -90,
                      position: "insideLeft"
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0px 4px 20px rgba(0,0,0,0.08)"
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="production"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    filter="url(#shadow)"
                  />

                </LineChart>
              </ResponsiveContainer>

            </div>
          </div>
        )}

        {/* Table */}
        {forecasts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Production</th>
                  <th className="p-3 text-left">Temperature</th>
                  <th className="p-3 text-left">Radiation</th>
                  <th className="p-3 text-left">Sunshine</th>
                </tr>
              </thead>

              <tbody>

                {forecasts.map((f, i) => (

                  <tr key={i} className="border-t hover:bg-slate-50">

                    <td className="p-3">
                      {formatTime(f.timestamp)}
                    </td>

                    <td className="p-3 font-semibold text-blue-600">
                      {(f.predictedProduction / 1000).toFixed(2)} kW
                    </td>

                    <td className="p-3">
                      {f.weather.AirTemperature}°C
                    </td>

                    <td className="p-3">
                      {f.weather.Radiation} W/m²
                    </td>

                    <td className="p-3">
                      {f.weather.Sunshine}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>
    </Layout>
  );
}

export default Forecast;