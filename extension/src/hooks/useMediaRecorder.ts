/// <reference types="chrome" />
import { useState, useRef, useEffect, useCallback } from 'react';

// Define the payload for your Content Script
interface StartRecordingMessage {
    type: 'START_RECORDING';
    timestamp: number;
}

interface UseMediaRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    audioData: Uint8Array;
    analyser: AnalyserNode | null;
    error: string | null;
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsRecording(false);
        setAudioData(new Uint8Array(0));
    }, []);

    const startRecording = async () => {
        setError(null);
        try {
            // Request Audio (Mic)
            // Note: In an extension, getUserMedia might pop up a permission request window.
            // We start with just Audio for the "Vibe" check. 
            // Screen share can be requested when strictly needed or immediately if we want full multimodal.
            // For this step, let's try to get both.

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            // Optionally get screen stream here if needed immediately, 
            // but usually we want to treat them separately or merge them.
            // const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

            streamRef.current = stream;

            console.log("getUserMedia called.");


            const tabs = await chrome.tabs.query({
                active: true,
                windowType: 'normal',
                currentWindow: false // Ensure we don't look at ourself
            });

            console.log("tabs: ", tabs);

            const targetTab = tabs[0];

            if (!targetTab?.id) {
                throw new Error("No active browser tab found to test.");
            }

            // ---------------------------------------------------------
            // 3. Signal the Content Script
            // ---------------------------------------------------------
            const message: StartRecordingMessage = {
                type: 'START_RECORDING',
                timestamp: Date.now()
            };

            await chrome.tabs.sendMessage(targetTab.id, message);

            // Setup Audio Analysis
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64; // Low res for visualizer
            source.connect(analyser);
            analyserRef.current = analyser;

            // Animation Loop for Visualizer Data
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVisualizer = () => {
                analyser.getByteFrequencyData(dataArray);
                setAudioData(new Uint8Array(dataArray)); // Create new array to trigger React render
                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };

            updateVisualizer();
            setIsRecording(true);

            console.log(stream);

        } catch (err: any) {
            console.error("Error starting recording:", err);

            // Handle Sidebar permission restriction
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setError('Microphone access denied. Open extension in a tab to grant permissions.');
            } else {
                setError(err.message || 'Failed to start recording');
            }

            cleanup();
        }
    };

    const stopRecording = () => {
        cleanup();
    };

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        audioData,
        analyser: analyserRef.current,
        error
    };
};
