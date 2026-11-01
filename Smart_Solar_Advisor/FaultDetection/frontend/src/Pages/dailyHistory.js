import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Download } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';

function DailyHistory() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    faultsDetected: 0,
    avgDeviation: 0
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
    fetchDevices();
  }, [navigate]);

  useEffect(() => {
    if (selectedDevice && selectedDate) {
      fetchHistory();
    }
  }, [selectedDevice, selectedDate]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/devices?refresh=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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

  const fetchHistory = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/faults/history/${selectedDevice._id}?date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setHistory(response.data.history || []);
        calculateStats(response.data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalRecords = data.length;
    const faultsDetected = data.filter(h => h.prediction.faultDetected).length;
    const avgDeviation = data.length > 0
      ? data.reduce((sum, h) => sum + Math.abs(h.prediction.deviation || 0), 0) / data.length
      : 0;

    setStats({
      totalRecords,
      faultsDetected,
      avgDeviation: avgDeviation.toFixed(2)
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFaultColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-300 text-red-700';
      case 'medium': return 'bg-orange-50 border-orange-300 text-orange-700';
      case 'low': return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      default: return 'bg-green-50 border-green-300 text-green-700';
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Daily History
              </h1>
              <p className="text-slate-600 mt-1">View fault detection history for selected date</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Device</label>
                  <select
                    value={selectedDevice?._id || ''}
                    onChange={(e) => {
                      const device = devices.find(d => d._id === e.target.value);
                      setSelectedDevice(device);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {devices.map(device => (
                      <option key={device._id} value={device._id}>
                        {device.deviceName} ({device.wifiSN})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Statistics */}
            {history.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="text-sm text-slate-600 mb-1">Total Records</div>
                  <div className="text-3xl font-bold text-slate-800">{stats.totalRecords}</div>
                  <div className="text-xs text-slate-500 mt-1">5-minute intervals</div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="text-sm text-slate-600 mb-1">Faults Detected</div>
                  <div className="text-3xl font-bold text-red-600">{stats.faultsDetected}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {stats.totalRecords > 0
                      ? ((stats.faultsDetected / stats.totalRecords) * 100).toFixed(1)
                      : 0}% of total
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="text-sm text-slate-600 mb-1">Avg Deviation</div>
                  <div className="text-3xl font-bold text-blue-600">{stats.avgDeviation}%</div>
                  <div className="text-xs text-slate-500 mt-1">From predicted</div>
                </div>
              </div>
            )}

            {/* History Table */}
            {!selectedDevice ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-slate-600">Please select a device to view history</p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-slate-600">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-slate-600">No history found for selected date</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Predicted</th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actual</th> */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deviation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fault Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {history.map((record, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {formatTime(record.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.prediction.faultDetected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Fault
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {Number(record.prediction?.predictedProduction || 0).toFixed(2)} W
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${Number(record.prediction?.deviation || 0) < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                              {Number(record.prediction?.deviation || 0) < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <TrendingUp className="w-4 h-4" />
                              )}
                              {Math.abs(Number(record.prediction?.deviation || 0)).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {(record.prediction?.faultType || 'none').replace('_', ' ').toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${getFaultColor(record.prediction.faultSeverity)}`}>
                              {(record.prediction?.faultSeverity || 'none').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default DailyHistory;
