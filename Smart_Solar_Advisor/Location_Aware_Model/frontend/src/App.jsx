import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import { authAPI } from './services/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
      } catch {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontSize:'24px'}}>Loading...</div>;

  const router = createBrowserRouter(
    [
      { path: '/login', element: user ? <Navigate to="/" /> : <Login onLogin={handleLogin} /> },
      { path: '/register', element: user ? <Navigate to="/" /> : <Register /> },
      { path: '/profile', element: user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/login" /> },
      { path: '/', element: user ? (user.is_admin ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Dashboard user={user} onLogout={handleLogout} />) : <Navigate to="/login" /> },
    ],
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }
    }
  );

  return <RouterProvider router={router} />;
};

export default App;
