import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { useNavigate } from 'react-router-dom';

const FD_FRONTEND_URL = import.meta.env.VITE_FD_FRONTEND_URL;

const FaultDetection = () => {
    const { user } = useAuth();
    const [iframeUrl, setIframeUrl] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Assuming Fault Detection frontend runs on port 8082
        // We pass user email or token if needed, or just embed the URL.
        // In many development setups localstorage is shared across localhost if port is ignored by browser,
        // but typically we can pass auth data if needed.
        const token = localStorage.getItem('fd_token') || localStorage.getItem('authToken') || '';
        const userEmail = user?.email || localStorage.getItem('userEmail') || '';

        // Construct the URL with token in query params if the other app supports it,
        // otherwise just embed the URL
        setIframeUrl(`${FD_FRONTEND_URL}?token=${token}&email=${userEmail}`);

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'redirect_login') {
                navigate('/login');
            } else if (event.data?.type === 'navigate' && event.data?.path) {
                navigate(event.data.path);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, navigate]);

    return (
        <div className="w-full h-[calc(100vh)] border-0 rounded-xl overflow-hidden shadow-sm bg-white">
            {iframeUrl && (
                <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    title="Fault Detection App"
                />
            )}
        </div>
    );
};

export default FaultDetection;
