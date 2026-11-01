import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sun,
  Battery,
  Zap,
  Activity,
  History,
  TrendingUp
} from "lucide-react";
import Logo from "../images/Logo.png";

function SideBar({ sidebarOpen }) {
  const location = useLocation();

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
    const baseClasses = "flex items-center gap-4 px-6 py-3 font-medium transition-all";
    const activeClasses = "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600";
    const inactiveClasses = "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-r-0";
    return activeTab === tabName ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
  };

  return (
    <aside
      className={`${sidebarOpen ? "w-64" : "w-20"
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="Smart Solar Advisor Logo" className="w-12 h-12 object-contain" />
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-800">
                SMART SOLAR ADVISO<span className="text-blue-600">R</span>
              </span>
              <span className="text-xs text-slate-500">
                Power Management
              </span>
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
          <Zap className="w-5 h-5 flex-shrink-0" />
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

      {/* Help box */}
      {sidebarOpen && (
        <div className="p-4 border-t border-slate-200">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-sm">
            <div className="font-semibold mb-1">Need Help?</div>
            <div className="text-xs text-blue-100">
              Contact our support team
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default SideBar;
