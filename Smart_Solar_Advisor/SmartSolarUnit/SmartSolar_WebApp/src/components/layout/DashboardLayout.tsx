import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Sun,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  Zap,
  LineChart as LineChartIcon,
  Sparkles,
  Map,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    "Near by forecasting": true
  });

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Different navigation items based on role
  const adminNavItems: any[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/sites", icon: Sun, label: "Solar Sites" },
    { path: "/analyze", icon: LineChartIcon, label: "Seasonal Prediction" },
    { path: "/xai-insights", icon: Sparkles, label: "XAI Insights" },
    { path: "/fault-detection", icon: Zap, label: "Fault Detection" },
    {
      path: "/nearby-forecasting",
      icon: Map,
      label: "Near by forecasting",
      children: [
        { path: "/nearby-forecasting/overview", label: "Overview" },
        { path: "/nearby-forecasting/sites", label: "Map Sites" },
        { path: "/nearby-forecasting/analytics", label: "Map Analytics" },
      ]
    },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const siteOwnerNavItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "My Dashboard" },
    { path: "/sites", icon: Sun, label: "My Sites" },
    { path: "/analyze", icon: LineChartIcon, label: "Seasonal Prediction" },
    { path: "/xai-insights", icon: Sparkles, label: "XAI Insights" },
    { path: "/fault-detection", icon: Zap, label: "Fault Detection" },
    { path: "/nearby-forecasting/overview", icon: Map, label: "Near by Forecasting" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const navItems = isAdmin ? adminNavItems : siteOwnerNavItems;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 gradient-deep transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">

            <img
              src="/Logo.png"
              alt="Smart Solar Advisor Logo"
              className="w-6 h-6 rounded-md object-contain"
            />

            <div>
              <h1 className="font-bold text-sidebar-foreground text-lg">Solar Advisor</h1>
              <p className="text-xs text-sidebar-foreground/60">IoT Platform</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden ml-auto text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.children && item.children.some((child: any) => location.pathname === child.path));

              if (item.children) {
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                        isActive || expanded[item.label]
                          ? "bg-sidebar-primary/50 text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium flex-1 text-left">{item.label}</span>
                      {expanded[item.label] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {expanded[item.label] && (
                      <div className="pl-11 pr-4 space-y-1">
                        {item.children.map((child: any) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "block px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                              location.pathname === child.path
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="w-5 h-5 text-sidebar-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {isAdmin ? "Administrator" : "Site Owner"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground capitalize">
                {location.pathname === "/analyze"
                  ? "Seasonal Prediction"
                  : location.pathname === "/xai-insights"
                    ? "Explainable AI Summary"
                    : location.pathname === "/fault-detection"
                      ? "Fault Detection"
                      : location.pathname.includes("/nearby-forecasting")
                        ? "Near by Forecasting"
                        : (location.pathname.split("/").pop() || "Dashboard")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                <span className="relative w-2 h-2 rounded-full bg-success status-pulse" />
                Live
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
