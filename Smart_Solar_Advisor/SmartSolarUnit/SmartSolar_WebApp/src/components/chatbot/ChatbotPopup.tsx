import React, { useState } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ChatbotPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const CHATBOT_URL = import.meta.env.VITE_CHATBOT_URL;

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 animate-bounce group"
                    style={{
                        animation: 'bounce 2s infinite',
                    }}
                >
                    <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
                </Button>
            )}

            {/* Chatbot Popup */}
            {isOpen && (
                <div className={`fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300 animate-in ${isFullscreen
                    ? 'inset-0 w-full h-full rounded-none slide-in-from-bottom-0'
                    : 'bottom-6 right-6 w-[600px] h-[800px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] rounded-2xl slide-in-from-bottom-5'
                    }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20">
                        <h3 className="font-semibold text-primary flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            SmartSolar Advisor
                        </h3>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-primary/20 text-gray-500 hover:text-primary transition-colors"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-primary/20 text-gray-500 hover:text-primary transition-colors"
                                onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
                                title="Hide Chatbot"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors"
                                onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
                                title="Close Chatbot"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Iframe Container */}
                    <div className="flex-1 w-full bg-gray-50 dark:bg-gray-800">
                        <iframe
                            src={CHATBOT_URL}
                            title="SmartSolar Chatbot"
                            className="w-full h-full border-none"
                            allow="clipboard-read; clipboard-write; microphone"
                        />
                    </div>
                </div>
            )}
        </>
    );
};
