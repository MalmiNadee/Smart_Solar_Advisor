import React, { useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const Login = () => {
  useEffect(() => {
    // Redirect to the main SmartSolar_WebApp login page
    if (window !== window.parent) {
      window.parent.postMessage({ type: 'redirect_login' }, '*');
    } else {
      window.location.href = `${BASE_URL}/login`;
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
      <p>Redirecting to login...</p>
    </div>
  );
};

export default Login;