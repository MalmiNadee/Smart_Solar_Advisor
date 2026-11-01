import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const NearbyForecasting = () => {
    const { isAdmin } = useAuth();
    const location = useLocation();

    let tabPath = "admin";
    if (location.pathname.includes("sites")) tabPath = "admin/sites";
    if (location.pathname.includes("analytics")) tabPath = "admin/analytics";

    const src = isAdmin
        ? `http://localhost:8083/${tabPath}?role=admin`
        : "http://localhost:8083/dashboard?role=customer";

    return (
        <DashboardLayout>
            <div className="w-full h-[calc(100vh-8rem)]">
                <iframe
                    src={src}
                    className="w-full h-full border-none rounded-xl bg-background"
                    title="Nearby Forecasting"
                />
            </div>
        </DashboardLayout>
    );
};

export default NearbyForecasting;
