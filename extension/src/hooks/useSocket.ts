import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5000';

interface UseSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
    connectSocket: (sessionId: string) => void;
    disconnectSocket: () => void;
    audioQueue: string[]; // Base64 strings from AI
    consumeAudio: () => string | undefined;
    clearQueue: () => void;
    messages: { text: string; source: 'ai' | 'user' }[];
}

export const useSocket = (): UseSocketReturn => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // We use a ref for the queue to stream it out without re-renders causing issues
    const audioQueueRef = useRef<string[]>([]);
    // Trigger re-render if needed or just expose method? 
    // For audio playback loop, direct ref access is better.
    // We expose a dummy state to maybe show "Queue size"? Optional.

    const [messages, setMessages] = useState<{ text: string; source: 'ai' | 'user' }[]>([]);

    const connectSocket = useCallback((sessionId: string) => {
        if (socket?.connected) return;

        console.log("Connecting socket to", DASHBOARD_URL);
        const newSocket = io(DASHBOARD_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 3
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            newSocket.emit('join_session', { sessionId, type: 'host' });
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('ai_audio', (data: { audio: string }) => {
            // data.audio is base64 PCM 16-bit 24kHz
            console.log("Received AI Audio Chunk", data.audio.substring(0, 20) + "...");
            audioQueueRef.current.push(data.audio);
        });

        newSocket.on('ai_interrupted', () => {
            console.log("AI Interrupted! Clearing queue.");
            audioQueueRef.current = [];
        });

        newSocket.on('ai_text', (data: { text: string }) => {
            console.log("AI Text:", data.text);
            setMessages(prev => [...prev, { text: data.text, source: 'ai' }]);
        });

        newSocket.on('ai_intervention', (data: { type: string }) => {
            console.log("AI Intervention:", data.type);
            // Handle later (e.g. show toast)
        });

        newSocket.on('request_snapshot', () => {
            console.log("Received Snapshot Request from Backend");
            chrome.tabs.query({ active: true, currentWindow: false, windowType: 'normal' }).then((tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_SNAPSHOT' }).catch(err => console.warn(err));
                }
            });
        });

        setSocket(newSocket);
    }, [socket]);

    const disconnectSocket = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
            audioQueueRef.current = [];
            setMessages([]);
        }
    }, [socket]);

    const consumeAudio = useCallback(() => {
        return audioQueueRef.current.shift();
    }, []);

    const clearQueue = useCallback(() => {
        audioQueueRef.current = [];
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        socket,
        isConnected,
        connectSocket,
        disconnectSocket,
        audioQueue: audioQueueRef.current, // Helper, might be stale in UI but ok for debug
        consumeAudio,
        clearQueue,
        messages
    };
};
