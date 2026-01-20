import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000';

interface UseSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
    connectSocket: (sessionId: string) => void;
    disconnectSocket: () => void;
    audioQueue: string[]; // Base64 strings from AI
    consumeAudio: () => string | undefined;
}

export const useSocket = (): UseSocketReturn => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // We use a ref for the queue to stream it out without re-renders causing issues
    const audioQueueRef = useRef<string[]>([]);
    // Trigger re-render if needed or just expose method? 
    // For audio playback loop, direct ref access is better.
    // We expose a dummy state to maybe show "Queue size"? Optional.

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
            newSocket.emit('join_session', { sessionId });
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('ai_audio', (data: { audio: string }) => {
            // data.audio is base64 PCM or Wav? 
            // Backend sends: "mediaChunks: [{ mimeType: 'audio/pcm;rate=24000', data: base64 }]" -> Gemini response...
            // Wait, Gemini Live API output is 24kHz PCM according to docs usually. 
            // In backend gateway: "client.emit('ai_audio', { audio: audioBase64 });"
            // The data comes from "response.serverContent.modelTurn.parts[0].inlineData.data".
            // So it IS base64 PCM.
            audioQueueRef.current.push(data.audio);
        });

        newSocket.on('ai_intervention', (data: { type: string }) => {
            console.log("AI Intervention:", data.type);
            // Handle later (e.g. show toast)
        });

        setSocket(newSocket);
    }, [socket]);

    const disconnectSocket = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
            audioQueueRef.current = [];
        }
    }, [socket]);

    const consumeAudio = useCallback(() => {
        return audioQueueRef.current.shift();
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
        consumeAudio
    };
};
