import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { adminAPI } from '../services/api';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend } from 'chart.js';
import '../styles/AdminDashboard.css';
import Footer from './Footer';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend
);

function AdminDashboard({ user, onLogout }) {
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewMode, setViewMode] = useState('grouped');
  const [selectedPredictions, setSelectedPredictions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // Clear selections when switching views
  useEffect(() => {
    setSelectedPredictions([]);
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, predsRes] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getAllUsers(),
        adminAPI.getAllPredictions()
      ]);
      
      setStatistics(statsRes.data);
      setUsers(usersRes.data.users || []);
      setPredictions(predsRes.data.predictions || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminAPI.deleteUser(userId);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      await adminAPI.toggleAdmin(userId);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleDeletePrediction = async (predictionId) => {
    if (window.confirm('Are you sure you want to delete this prediction?')) {
      try {
        await adminAPI.deletePrediction(predictionId);
        alert('Prediction Deleted Successfully');
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete prediction');
      }
    }
  };

  const togglePredictionSelection = (id) => {
    setSelectedPredictions(prev =>
      prev.includes(id)
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  };

  const selectAllPredictions = (list) => {
    const ids = list.map(p => p.id);
    if (selectedPredictions.length === ids.length && ids.every(id => selectedPredictions.includes(id))) {
      setSelectedPredictions([]);
    } else {
      setSelectedPredictions(ids);
    }
  };

  const handleDeleteSelectedPredictions = async () => {
    if (selectedPredictions.length === 0) {
      alert('No predictions selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedPredictions.length} prediction${selectedPredictions.length > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedPredictions.map(id => adminAPI.deletePrediction(id))
      );

      alert('Selected predictions deleted successfully');
      setSelectedPredictions([]);
      loadData();
    } catch (error) {
      alert('Failed to delete selected predictions');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredUsers = sortedUsers.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPredictions = predictions.reduce((acc, pred) => {
    const key = pred.user_id;
    if (!acc[key]) {
      acc[key] = {
        user_id: pred.user_id,
        username: pred.username || `User ${pred.user_id}`,
        predictions: [],
        location: `${pred.latitude.toFixed(2)}, ${pred.longitude.toFixed(2)}`,
        year: pred.year,
        months: [],
        totalEnergy: 0,
        totalConfidence: 0
      };
    }
    acc[key].predictions.push(pred);
    acc[key].months.push(pred);
    acc[key].totalEnergy += pred.predicted_energy_kwh;
    acc[key].totalConfidence += pred.confidence_score;
    return acc;
  }, {});

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Navbar user={user} onLogout={onLogout} />
        <div className="loading-container">
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const monthlyCounts = Array(12).fill(0);

  predictions.forEach(p => {
    let monthStr;
    if (typeof p.month === 'string') {
      monthStr = p.month.split(' ')[0];
    } else {
      monthStr = new Date(p.created_at).toLocaleString('default', { month: 'short' });
    }

    const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyCounts[monthIndex] += 1;
    }
  });

  const monthlyPredictionsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Predictions Count',
        data: monthlyCounts,
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
      }
    ]
  };

  const userTypeData = {
    labels: ['Regular Users', 'Admin Users'],
    datasets: [
      {
        data: [
          statistics?.users?.regular || 0,
          statistics?.users?.admins || 0
        ],
        backgroundColor: ['rgba(16, 185, 129, 0.6)', 'rgba(245, 87, 108, 0.6)'],
        borderColor: ['rgba(16, 185, 129, 1)', 'rgba(245, 87, 108, 1)'],
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="dashboard">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="admin-dashboard-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={activeTab === 'predictions' ? 'active' : ''}
            onClick={() => setActiveTab('predictions')}
          >
            Predictions ({predictions.length})
          </button>
        </div>

        {activeTab === 'overview' && statistics && (
          <div className="overview-tab">
            <div className="stats-cards">
              <div className="stat-card blue">
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <p className="stat-value">{statistics.users.total}</p>
                </div>
              </div>

              <div className="stat-card green">
                <div className="stat-content">
                  <h3>Total Predictions</h3>
                  <p className="stat-value">{statistics.predictions.total}</p>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-content">
                  <h3>Avg Confidence</h3>
                  <p className="stat-value">
                    {(statistics.predictions.average_confidence * 100).toFixed(1)}%
                  </p>
                  <span className="stat-detail">Model accuracy indicator</span>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3>Monthly Predictions</h3>
                <div className="chart-wrapper">
                  <Bar data={monthlyPredictionsData} options={{ responsive: true, maintainAspectRatio: true }} />
                </div>
              </div>

              <div className="chart-card">
                <h3>User Distribution</h3>
                <div className="chart-wrapper pie">
                  <Pie data={userTypeData} options={{ responsive: true, maintainAspectRatio: true }} />
                </div>
              </div>
            </div>

            {statistics.top_users && statistics.top_users.length > 0 && (
              <div className="top-users-card">
                <h3>Top Users by Activity</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Username</th>
                      <th>Predictions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.top_users.map((u, idx) => (
                      <tr key={idx}>
                        <td className="rank">#{idx + 1}</td>
                        <td>{u.username}</td>
                        <td className="predictions-count">{u.prediction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="toolbar">
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button
                onClick={() => exportToCSV(users, 'users.csv')}
                className="export-btn"
              >
                Export CSV
              </button>
            </div>

            <div className="table-card">
              <h3>User Management</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                        ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                        Username {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.is_admin ? 'admin' : 'user'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="toggle-admin-btn"
                              onClick={() => handleToggleAdmin(u.id)}
                              disabled={u.id === user.id}
                              title={u.is_admin ? 'Demote to User' : 'Promote to Admin'}
                            >
                              {u.is_admin ? '⬇️' : '⬆️'}
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === user.id}
                              title="Delete User"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="predictions-tab">
            <div className="toolbar">
              <div className="view-toggle">
                <button
                  onClick={() => setViewMode('all')}
                  className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
                >
                  All Predictions
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                >
                  Grouped by User
                </button>
              </div>
              <button
                onClick={() => exportToCSV(predictions, 'predictions.csv')}
                className="export-btn"
              >
                Export CSV
              </button>
              {selectedPredictions.length > 0 && (
                <button
                  className="delete-selected-btn"
                  onClick={handleDeleteSelectedPredictions}
                >
                  Delete Selected ({selectedPredictions.length})
                </button>
              )}
            </div>

            <div className="table-card">
              <h3>Recent Predictions</h3>
              <div className="table-wrapper">
                {viewMode === 'all' ? (
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={
                              predictions.slice(0, 50).length > 0 &&
                              predictions.slice(0, 50).every(p => selectedPredictions.includes(p.id))
                            }
                            onChange={() => selectAllPredictions(predictions.slice(0, 50))}
                          />
                        </th>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Username</th>
                        <th>Location</th>
                        <th>Date</th>
                        <th>Energy (kWh)</th>
                        <th>Confidence</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.slice(0, 50).map(p => (
                        <tr key={p.id} className={selectedPredictions.includes(p.id) ? 'selected-row' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedPredictions.includes(p.id)}
                              onChange={() => togglePredictionSelection(p.id)}
                            />
                          </td>
                          <td>{p.id}</td>
                          <td>{p.user_id}</td>
                          <td>{p.username}</td>
                          <td>{p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}</td>
                          <td>
                            {new Date(2000, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                          </td>
                          <td className="energy-value">{p.predicted_energy_kwh.toFixed(2)}</td>
                          <td>
                            <span className="confidence-indicator">
                              {(p.confidence_score * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="delete-icon-btn"
                              onClick={() => handleDeletePrediction(p.id)}
                              title="Delete Prediction"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grouped-predictions">
                    {Object.values(groupedPredictions).map(group => (
                      <div key={group.user_id} className="user-group">
                        <div className="user-group-header">
                          <h4>
                            {group.username}
                            <span className="pred-count">
                              ({group.predictions.length} prediction{group.predictions.length !== 1 ? 's' : ''})
                            </span>
                          </h4>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>
                                <input
                                  type="checkbox"
                                  checked={
                                    group.predictions.length > 0 &&
                                    group.predictions.every(p => selectedPredictions.includes(p.id))
                                  }
                                  onChange={() => selectAllPredictions(group.predictions)}
                                />
                              </th>
                              <th>ID</th>
                              <th>Location</th>
                              <th>Date</th>
                              <th>Energy (kWh)</th>
                              <th>Confidence</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.predictions.map(p => (
                              <tr key={p.id} className={selectedPredictions.includes(p.id) ? 'selected-row' : ''}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedPredictions.includes(p.id)}
                                    onChange={() => togglePredictionSelection(p.id)}
                                  />
                                </td>
                                <td>{p.id}</td>
                                <td>{p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}</td>
                                <td>
                                  {new Date(2000, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                                </td>
                                <td className="energy-value">{p.predicted_energy_kwh.toFixed(2)}</td>
                                <td>
                                  <span className="confidence-indicator">
                                    {(p.confidence_score * 100).toFixed(1)}%
                                  </span>
                                </td>
                                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                <td>
                                  <button
                                    className="delete-icon-btn"
                                    onClick={() => handleDeletePrediction(p.id)}
                                    title="Delete Prediction"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default AdminDashboard;