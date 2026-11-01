import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BarChart3, Settings, LogOut, Sun, Users, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const customerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/sites", label: "Sites", icon: Activity },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? adminLinks : customerLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
