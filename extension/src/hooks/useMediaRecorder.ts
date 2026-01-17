/// <reference types="chrome" />
import { useState, useRef, useEffect, useCallback } from 'react';

// Define the payload for your Content Script
// interface StartRecordingMessage {
//     type: 'START_RECORDING';
//     timestamp: number;
// }

interface UseMediaRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    toggleMute: () => void;
    isMuted: boolean;
    audioData: Uint8Array;
    analyser: AnalyserNode | null;
    error: string | null;
    devices: MediaDeviceInfo[];
    selectedAudioId: string;
    setSelectedAudioId: (id: string) => void;
    selectedVideoId: string;
    setSelectedVideoId: (id: string) => void;
    checkPermissions: () => Promise<void>;
    permissionError: boolean;
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioId, setSelectedAudioId] = useState<string>('');
    const [selectedVideoId, setSelectedVideoId] = useState<string>('');

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null); // Keep track of source to disconnect
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [permissionError, setPermissionError] = useState<boolean>(false);

    const checkPermissions = useCallback(async () => {
        try {
            // Must ask for permission first to get labels
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionError(false);

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(allDevices);

            const audioDevices = allDevices.filter(d => d.kind === 'audioinput');

            if (audioDevices.length > 0 && !selectedAudioId) {
                // Check if the currently selected ID effectively still exists? 
                // For now just default if empty
                setSelectedAudioId(audioDevices[0].deviceId);
            }
        } catch (err: any) {
            console.error("Failed to enumerate devices:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setPermissionError(true);
            }
        }
    }, [selectedAudioId]);

    // Initial load
    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null; // Fix: Clear analyser so it's recreated with new Context
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        // Don't reset devices/selected IDs here, only session state
        setIsRecording(false);
        setAudioData(new Uint8Array(0));
    }, []);

    // Helper to setup AudioContext chain from a stream
    const connectStreamToAnalyser = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;

        // If we had an old source, disconnect it
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        if (!analyserRef.current) {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;
        }

        source.connect(analyserRef.current!);

        // Start vis loop if not running
        if (!animationFrameRef.current) {
            const bufferLength = analyserRef.current!.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVisualizer = () => {
                if (analyserRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    setAudioData(new Uint8Array(dataArray));
                }
                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();
        }
    };

    const getMediaStream = async (audioId: string) => {
        const audioConstraints: boolean | MediaTrackConstraints = audioId
            ? { deviceId: { exact: audioId } }
            : true;

        return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });
    }

    const startRecording = async () => {
        setError(null);
        try {
            // 1. Get Mic Stream
            const stream = await getMediaStream(selectedAudioId);
            streamRef.current = stream;

            // Apply initial mute state
            stream.getAudioTracks().forEach(t => t.enabled = !isMuted);

            // 2. Setup Audio Processing
            connectStreamToAnalyser(stream);

            // 3. Signal Content Script (The Session Logic)
            const tabs = await chrome.tabs.query({ active: true, currentWindow: false, windowType: 'normal' });
            const targetTab = tabs[0];
            if (!targetTab?.id) throw new Error("No active browser tab found.");

            await chrome.tabs.sendMessage(targetTab.id, {
                type: 'START_RECORDING',
                timestamp: Date.now()
            });

            setIsRecording(true);

        } catch (err: any) {
            console.error("Error starting recording:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setError('Microphone access denied. Open extension popup to grant permissions.');
            } else {
                setError(err.message || 'Failed to start recording');
            }
            cleanup();
        }
    };

    // Hot-swapping Audio Device
    useEffect(() => {
        if (!isRecording) return;

        // If generic state update (e.g. init), don't restart if stream already matches?
        // Actually, checking if stream track matches selection is complex. 
        // We'll just assume if ID changed and we are recording, we switch.

        const switchDevice = async () => {
            try {
                const newStream = await getMediaStream(selectedAudioId);

                // Stop old tracks to release mic light
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                }

                streamRef.current = newStream;
                // Apply mute state to new stream
                newStream.getAudioTracks().forEach(t => t.enabled = !isMuted);

                // Reconnect analysis
                connectStreamToAnalyser(newStream);
            } catch (err) {
                console.error("Failed to switch device:", err);
                setError("Failed to switch input device");
            }
        };

        switchDevice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAudioId, isRecording, isMuted]); // Trigger when ID changes or mute state changes (to apply to new stream)


    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newState = !prev;
            if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => t.enabled = !newState);
            }
            return newState;
        });
    }, []);

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
        toggleMute,
        isMuted,
        audioData,
        analyser: analyserRef.current,
        error,
        devices,
        selectedAudioId,
        setSelectedAudioId,
        selectedVideoId,
        setSelectedVideoId,
        checkPermissions,
        permissionError
    };
};
