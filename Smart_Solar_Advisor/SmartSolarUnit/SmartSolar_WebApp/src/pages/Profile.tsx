import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, LogOut, Zap } from "lucide-react";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Card */}
        <div className="p-8 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
            <div className="w-20 h-20 rounded-2xl gradient-solar flex items-center justify-center glow-orange">
              <User className="w-10 h-10 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{user?.name || (user?.role === 'admin' ? 'Administrator' : 'Site Owner')}</h2>
              <p className="text-muted-foreground">{user?.email || "user@solar.com"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-accent/10 text-accent' 
                    : 'bg-blue-500/10 text-blue-600'
                }`}>
                  <Shield className="w-3 h-3" />
                  {user?.role === 'admin' ? 'Admin Access' : 'Site Owner'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium text-foreground">{user?.email || "admin@solar.com"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-foreground">
                  {user?.role === 'admin' ? 'System Administrator' : 'Site Owner'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="font-medium text-foreground">Smart Solar Advisor v1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Account Actions</h3>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* System Info */}
        <div className="p-6 rounded-xl bg-muted/50 border border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">System Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Version:</span>
              <span className="ml-2 text-foreground">1.0.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Build:</span>
              <span className="ml-2 text-foreground">Production</span>
            </div>
            <div>
              <span className="text-muted-foreground">Backend:</span>
              <span className="ml-2 text-foreground">REST API</span>
            </div>
            <div>
              <span className="text-muted-foreground">Auth:</span>
              <span className="ml-2 text-foreground">Firebase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
