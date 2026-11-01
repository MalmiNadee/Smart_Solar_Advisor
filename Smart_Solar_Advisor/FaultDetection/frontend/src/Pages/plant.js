import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Battery, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';

function Plant() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ ADD: live solar data state (same as App.js)
  const [liveData, setLiveData] = useState({
    acpower: 0,
    yieldtoday: 0,
    yieldtotal: 0,
    powerdc1: 0,
    powerdc2: 0,
    powerdc3: 0,
    powerdc4: 0,
    batPower: 0,
    soc: 0,
    inverterStatus: null,
    uploadTime: null,
  });

  const [summary, setSummary] = useState({
    totalDevices: 0,
    totalProduction: 0,
    totalYield: 0,
    activeDevices: 0,
    faultDevices: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoggedIn(true);
    setUsername(userEmail || 'User');

    // ✅ Run in sequence: devices first, then live data overwrites
    const init = async () => {
      await fetchDevices();
      await fetchLiveSolaxData();
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (devices.length > 0) {
      calculateSummary();
    }
  }, [devices]);

  // ✅ ADD: same fetchLiveSolaxData as App.js
  const fetchLiveSolaxData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/solax/realtime`);
      console.log('Plant.js - Live Solax Data:', response.data);

      if (response.data && response.data.success && response.data.result) {
        const live = response.data.result;
        setLiveData({
          acpower: live.acpower || 0,
          yieldtoday: live.yieldtoday || 0,
          yieldtotal: live.yieldtotal || 0,
          powerdc1: live.powerdc1 || 0,
          powerdc2: live.powerdc2 || 0,
          powerdc3: live.powerdc3 || 0,
          powerdc4: live.powerdc4 || 0,
          batPower: live.batPower || 0,
          soc: live.soc || 0,
          inverterStatus: live.inverterStatus || null,
          uploadTime: live.uploadTime || null,
        });

        // ✅ Also update summary production with live values
        setSummary(prev => ({
          ...prev,
          totalProduction: (live.acpower || 0) / 1000,
          totalYield: live.yieldtoday || 0,
        }));
      }
    } catch (error) {
      console.error('Plant.js - Failed to fetch live Solax data:', error);
    }
  };

  // ================= FETCH DEVICES =================
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/devices?refresh=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Devices API response:", response.data);

      if (response.data.success) {
        const deviceList = Array.isArray(response.data.devices)
          ? response.data.devices
          : [];
        setDevices(deviceList);
      }

    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  // ================= CALCULATE SUMMARY =================
  const calculateSummary = async () => {
    const token = localStorage.getItem('token');

    let activeDevices = 0;
    let faultDevices = 0;

    for (const device of devices) {
      if (device.status === 'active') activeDevices++;

      try {
        const faultResponse = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/faults/status/${device._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (
          faultResponse.data.hasHistory &&
          faultResponse.data.latestFault.faultDetected
        ) {
          faultDevices++;
        }
      } catch (error) {
        console.log("Fault check error:", error);
      }
    }

    setSummary(prev => ({
      ...prev,
      totalDevices: devices.length,
      activeDevices,
      faultDevices,
      // ✅ production & yield come from liveData, set in fetchLiveSolaxData
    }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) {
    return (
      <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Card icon={<Activity />} value={summary.totalDevices} label="Total Devices" bg="blue" />
          <Card icon={<Battery />} value={summary.activeDevices} label="Active Devices" bg="purple" />
          <Card
            icon={<AlertTriangle />}
            value={summary.faultDevices}
            label="Faulty Devices"
            bg={summary.faultDevices > 0 ? 'red' : 'green'}
          />
        </div>

        {/* DEVICE LIST */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">All Devices</h2>

          {devices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No devices found</p>
              <button
                onClick={() => navigate('/add-device')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Device
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                // ✅ Pass liveData into DeviceCard for the first/only device
                <DeviceCard
                  key={device._id}
                  device={device}
                  liveData={liveData}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Card({ icon, value, label, bg }) {
  const bgColor =
    bg === 'blue' ? 'from-blue-500 to-blue-600' :
    bg === 'purple' ? 'from-purple-500 to-purple-600' :
    bg === 'red' ? 'from-red-500 to-red-600' :
    'from-green-500 to-green-600';

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-xl shadow-md p-6 text-white`}>
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  );
}

function DeviceCard({ device, liveData }) {
  const [faultStatus, setFaultStatus] = useState(null);

  useEffect(() => {
    const fetchFaultStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/faults/status/${device._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.hasHistory) {
          setFaultStatus(response.data.latestFault);
        }
      } catch (error) {
        console.log("Fault fetch error:", error);
      }
    };
    fetchFaultStatus();
  }, [device._id]);

  // ✅ Use liveData instead of device.latestData (which has 0s)
  const acPower = liveData.acpower || 0;
  const yieldToday = liveData.yieldtoday || 0;

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-800">{device.deviceName}</h3>
          <p className="text-xs text-slate-500">{device.wifiSN}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {device.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">AC Power</span>
          <span className="font-semibold">{(acPower / 1000).toFixed(2)} kW</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Daily Yield</span>
          <span className="font-semibold">{yieldToday.toFixed(2)} kWh</span>
        </div>

        {faultStatus && (
          <div className={`mt-2 p-2 rounded text-xs ${
            faultStatus.faultDetected
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {faultStatus.faultDetected ? (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Fault: {faultStatus.faultType.replace('_', ' ')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Normal</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Plant;