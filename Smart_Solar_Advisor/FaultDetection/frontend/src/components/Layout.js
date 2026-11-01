import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Battery, Zap, Menu, Bell, Plus, User, LogOut, Activity, History, TrendingUp } from 'lucide-react';
import Logo from '../images/Logo.png';

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Layout({ children, isLoggedIn, username, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isIframe = window !== window.parent;

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'overview';
    if (path === '/plant') return 'plant';
    if (path === '/add-device') return 'devices';
    if (path === '/live-data') return 'live';
    if (path === '/daily-history') return 'history';
    if (path === '/forecast') return 'forecast';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const getLinkClasses = (tabName) => {
    const baseClasses = "flex items-center gap-4 px-6 py-3 font-medium transition-all duration-200 border-l-4";
    const activeClasses = "bg-slate-800/50 text-orange-500 border-orange-500";
    const inactiveClasses = "text-slate-300 hover:bg-slate-800/30 hover:text-white border-transparent";
    return activeTab === tabName ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  // Render the full layout even inside an iframe so users can navigate
  // the Fault Detection web app internally.

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-[#0e1729] to-[#18253d] shadow-2xl transition-all duration-300 flex flex-col border-r border-slate-800`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Smart Solar Advisor Logo" className="w-10 h-10 object-contain rounded-md" />
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">Solar Advisor</span>
                <span className="text-xs text-slate-400">IoT Platform</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <Link
            to="/dashboard"
            className={getLinkClasses("overview")}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Overview</span>}
          </Link>

          <Link
            to="/plant"
            className={getLinkClasses("plant")}
          >
            <Sun className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Plant</span>}
          </Link>

          <Link
            to="/add-device"
            className={getLinkClasses("devices")}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Devices</span>}
          </Link>

          <Link
            to="/live-data"
            className={getLinkClasses("live")}
          >
            <Battery className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Live Data</span>}
          </Link>

          <Link
            to="/daily-history"
            className={getLinkClasses("history")}
          >
            <History className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Daily History</span>}
          </Link>

          <Link
            to="/forecast"
            className={getLinkClasses("forecast")}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Forecast</span>}
          </Link>
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-4 text-white text-sm border border-slate-700/50">
              <div className="font-semibold mb-1 text-slate-200">Need Help?</div>
              <div className="text-xs text-slate-400">Contact our support team</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (window !== window.parent) {
                    window.parent.postMessage({ type: 'navigate', path: '/dashboard' }, '*');
                  } else {
                    window.location.href = `${BASE_URL}/dashboard`;
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium mr-2"
              >
                ← Back to Smart Solar
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <>
                  <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  </button>
                  <button
                    onClick={() => navigate("/add-device")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Device
                  </button>
                </>
              )}

              {isLoggedIn ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-lg">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{username}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md font-medium"
                >
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
