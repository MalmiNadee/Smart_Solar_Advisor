import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SolarSites from "@/pages/SolarSites";
import SiteDetail from "@/pages/SiteDetail";
import Summary from "@/pages/Summary";
import Profile from "@/pages/Profile";
import Analyze from "@/pages/Analyze";
import XAIInsights from "@/pages/XAIInsights";
import FaultDetection from "@/pages/FaultDetection";
import NotFound from "@/pages/NotFound";
import { ChatbotPopup } from "@/components/chatbot/ChatbotPopup";
import NearbyForecasting from "@/pages/NearbyForecasting";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites"
              element={
                <ProtectedRoute>
                  <SolarSites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites/:siteId"
              element={
                <ProtectedRoute>
                  <SiteDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyze"
              element={
                <ProtectedRoute>
                  <Analyze />
                </ProtectedRoute>
              }
            />
            <Route
              path="/xai-insights"
              element={
                <ProtectedRoute>
                  <XAIInsights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fault-detection"
              element={
                <ProtectedRoute>
                  <FaultDetection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nearby-forecasting"
              element={<Navigate to="/nearby-forecasting/overview" replace />}
            />
            <Route
              path="/nearby-forecasting/:tab"
              element={
                <ProtectedRoute>
                  <NearbyForecasting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary"
              element={
                <ProtectedRoute>
                  <Summary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatbotPopup />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
