import React from 'react';
import { Navigate } from 'react-router-dom';
import { Sun, ShieldCheck, Activity, Zap } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const Landing = () => {
    const isIframe = window !== window.parent;
    if (isIframe) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>

            <div className="max-w-4xl w-full z-10 bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl flex flex-col items-center text-center">

                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-2xl shadow-lg mb-6">
                    <Sun className="w-12 h-12 text-white" />
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
                    Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Solar</span> Advisor
                </h1>

                <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-10 font-light">
                    Advanced AI-powered fault detection and monitoring for your solar power infrastructure. Ensure maximum efficiency and prevent downtime.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-3xl">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center hover:bg-white/10 transition-colors">
                        <Activity className="w-8 h-8 text-blue-400 mb-3" />
                        <h3 className="text-white font-semibold mb-1">Real-time Monitoring</h3>
                        <p className="text-blue-200/70 text-sm text-center">Track your solar yield and consumption 24/7</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center hover:bg-white/10 transition-colors">
                        <ShieldCheck className="w-8 h-8 text-green-400 mb-3" />
                        <h3 className="text-white font-semibold mb-1">Fault Detection</h3>
                        <p className="text-blue-200/70 text-sm text-center">AI algorithms detect anomalies instantly</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center hover:bg-white/10 transition-colors">
                        <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                        <h3 className="text-white font-semibold mb-1">Maximized Yield</h3>
                        <p className="text-blue-200/70 text-sm text-center">Optimize power generation automatically</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                    <button
                        onClick={() => {
                            if (window !== window.parent) {
                                window.parent.postMessage({ type: 'redirect_login' }, '*');
                            } else {
                                window.location.href = `${BASE_URL}/login`;
                            }
                        }}
                        className="flex-1 bg-white text-blue-900 font-bold text-lg py-4 px-8 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center"
                    >
                        Log In
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 text-white/50 text-sm">
                &copy; {new Date().getFullYear()} Smart Solar Advisor. Faculty of Engineering project.
            </div>
        </div>
    );
};

export default Landing;
