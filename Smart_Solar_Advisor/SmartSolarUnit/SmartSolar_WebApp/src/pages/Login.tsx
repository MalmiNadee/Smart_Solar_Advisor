import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Brain, Mail, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to Solar Advisor",
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-deep relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-solar-orange rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-solar-orange rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <img 
              src="/Logo.png" 
              alt="Smart Solar Advisor Logo" 
              className="w-16 h-16 rounded-2xl object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">Smart Solar Advisor</h1>
              <p className="text-primary-foreground/60">IoT Energy Forecasting Platform</p>
            </div>
          </div>
          <div className="space-y-6 max-w-md">
            <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
              Monitor & Forecast Solar Energy in Real-Time
            </h2>
            <p className="text-lg text-primary-foreground/70">
              Advanced IoT-driven platform for monitoring solar installations, 
              analyzing sensor data, and predicting energy generation using machine learning.
            </p>
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-primary-foreground">Real-time Monitoring</p>
                  <p className="text-sm text-primary-foreground/60">Live sensor data updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-solar-orange/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-solar-orange" />
                </div>
                <div>
                  <p className="font-medium text-primary-foreground">ML Predictions</p>
                  <p className="text-sm text-primary-foreground/60">5-minute energy forecasts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img 
              src="/Logo.png" 
              alt="Smart Solar Advisor Logo" 
              className="w-12 h-12 rounded-xl object-contain"
            />
            <h1 className="text-2xl font-bold text-foreground">Solar Advisor</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Login</h2>
            <p className="text-muted-foreground">
              Sign in to access the smart solar advisor dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@solar.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-solar text-accent-foreground hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Smart Solar Advisor v1.0 • IoT Energy Forecasting Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
