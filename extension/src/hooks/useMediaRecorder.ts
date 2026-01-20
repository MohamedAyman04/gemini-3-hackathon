/// <reference types="chrome" />
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { downsample, convertFloat32ToInt16 } from '../utils/audioUtils';

export interface UseMediaRecorderReturn {
    isRecording: boolean;
    startRecording: (socket?: Socket | null) => Promise<void>;
    stopRecording: () => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
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
    stream: MediaStream | null;
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioId, setSelectedAudioId] = useState<string>('');
    const [selectedVideoId, setSelectedVideoId] = useState<string>('');

    // We use State for the UI to be reactive (preview video)
    const [stream, setStream] = useState<MediaStream | null>(null);

    // We use Ref for internal logic (analyser, track modification) to avoid closure stale state
    const streamRef = useRef<MediaStream | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [permissionError, setPermissionError] = useState<boolean>(false);

    const checkPermissions = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // Immediately release the hardware, we only needed to check permissions/labels
            stream.getTracks().forEach(t => t.stop());
            setPermissionError(false);

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(allDevices);

            const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
            if (audioDevices.length > 0 && !selectedAudioId) {
                setSelectedAudioId(audioDevices[0].deviceId);
            }

            const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length > 0 && !selectedVideoId) {
                setSelectedVideoId(videoDevices[0].deviceId);
            }
        } catch (err: any) {
            console.error("Failed to enumerate devices:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setPermissionError(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (videoIntervalRef.current) {
            clearInterval(videoIntervalRef.current);
            videoIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsRecording(false);
        setAudioData(new Uint8Array(0));
    }, []);

    const connectStreamToAnalyser = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;

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

    const getMediaStream = async (audioId: string | boolean, videoId: string | boolean) => {
        const audioConstraints = typeof audioId === 'string'
            ? (audioId ? { deviceId: { exact: audioId } } : true)
            : audioId;

        const videoConstraints = typeof videoId === 'string'
            ? (videoId ? { deviceId: { exact: videoId } } : true)
            : videoId;

        return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: videoConstraints
        });
    }

    const updateStreamTrack = (kind: 'audio' | 'video', newTrack: MediaStreamTrack | null) => {
        if (!streamRef.current) return;

        const oldTracks = kind === 'audio' ? streamRef.current.getAudioTracks() : streamRef.current.getVideoTracks();
        oldTracks.forEach(t => {
            t.stop();
            streamRef.current?.removeTrack(t);
        });

        if (newTrack) {
            streamRef.current.addTrack(newTrack);
        }

        // Important: Start transition by updating state to trigger re-render if needed (though ref is mutated in place)
        // Since mutation happens in place, React state 'streamRef.current' is same object. 
        // We might need to clone it to trigger React? 
        // But for <video preview>, as long as track is added, does it update?
        // Safer: setStream(new MediaStream(streamRef.current.getTracks()));
        // Or just let it be if user says toggle works. 
        // For now, let's keep mutation, but maybe re-set state to be safe.
        setStream(new MediaStream(streamRef.current.getTracks()));
    };

    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Lazy load Utils to avoid issues if files missing during refactor (though we just created them)
    // Actually better to import them at top. Added imports at top of file.

    const startRecording = async (socket?: Socket | null) => {
        setError(null);
        try {
            setIsAudioEnabled(true);
            setIsVideoEnabled(true);

            const newStream = await getMediaStream(selectedAudioId, selectedVideoId);
            streamRef.current = newStream;
            setStream(newStream);

            connectStreamToAnalyser(newStream);

            const tabs = await chrome.tabs.query({ active: true, currentWindow: false, windowType: 'normal' });
            const targetTab = tabs[0];
            if (targetTab?.id) {
                // Best effort signaling
                chrome.tabs.sendMessage(targetTab.id, {
                    type: 'START_RECORDING',
                    timestamp: Date.now()
                }).catch(() => { /* Content script might not be ready, ignore */ });
            }

            setIsRecording(true);

            // --- Streaming Logic ---
            if (socket) {
                // 1. Audio Streaming
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }
                const ctx = audioContextRef.current;

                // Re-create source for processing if needed (analyser setup might have done it)
                // We need a source that persists for the processor
                const processSource = ctx.createMediaStreamSource(newStream);

                // Buffer size 4096 = ~92ms at 44.1kHz. 
                // We want ~250ms chunks ideally for Gemini? Or smaller for realtime? 
                // 4096 is standard for ScriptProcessor. 
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (!socket.connected) return;

                    const inputData = e.inputBuffer.getChannelData(0);
                    // Downsample to 16kHz
                    const downsampled = downsample(inputData, ctx.sampleRate, 16000);
                    const pcm16 = convertFloat32ToInt16(downsampled);

                    // Send as base64 or buffer? Socket.io handles binary well usually.
                    // Gemini Service expects: "mediaChunks: [{ ... data: base64 }]"
                    // Gateway expects: "session.geminiSession.sendAudio(buffer)"
                    // Let's send raw buffer to gateway, gateway handles it.
                    socket.emit('audio_chunk', pcm16.buffer);
                };

                processSource.connect(processor);
                processor.connect(ctx.destination); // ScriptProcessor needs to be connected to destination to fire

                // 2. Video Streaming
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                    canvasRef.current.width = 640; // 360p or 480p is enough for AI
                    canvasRef.current.height = 360;
                }
                const canvas = canvasRef.current;
                const canvasCtx = canvas.getContext('2d');

                // Create a video element to grab frames from stream (since we can't grab from MediaStreamTrack directly easily without ImageCapture API which is flaky)
                const vid = document.createElement('video');
                vid.srcObject = newStream;
                vid.muted = true;
                await vid.play();

                videoIntervalRef.current = setInterval(() => {
                    if (!socket.connected || !canvasCtx) return;

                    if (vid.readyState === vid.HAVE_ENOUGH_DATA) {
                        canvasCtx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                        // Quality 0.5 for speed
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                        const base64 = dataUrl.split(',')[1];
                        socket.emit('screen_frame', { frame: base64 });
                    }
                }, 1000); // 1 FPS
            }

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

    useEffect(() => {
        if (!isRecording) return;
        const switchDevice = async () => {
            try {
                if (isAudioEnabled) {
                    const audioStream = await getMediaStream(selectedAudioId, false);
                    const newAudioTrack = audioStream.getAudioTracks()[0];
                    updateStreamTrack('audio', newAudioTrack);
                    connectStreamToAnalyser(streamRef.current!);
                }

                if (isVideoEnabled) {
                    const videoStream = await getMediaStream(false, selectedVideoId);
                    const newVideoTrack = videoStream.getVideoTracks()[0];
                    updateStreamTrack('video', newVideoTrack);
                }

            } catch (err) {
                console.error("Failed to switch device:", err);
                setError("Failed to switch input device");
            }
        };

        switchDevice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAudioId, selectedVideoId, isRecording]);

    const toggleAudio = useCallback(async () => {
        if (!isRecording || !streamRef.current) return;

        if (isAudioEnabled) {
            updateStreamTrack('audio', null);
            setIsAudioEnabled(false);
        } else {
            try {
                const stream = await getMediaStream(selectedAudioId, false);
                const newTrack = stream.getAudioTracks()[0];
                if (newTrack) {
                    updateStreamTrack('audio', newTrack);
                    connectStreamToAnalyser(streamRef.current);
                }
                setIsAudioEnabled(true);
            } catch (err) {
                console.error("Failed to re-enable audio", err);
                setError("Failed to enable microphone");
            }
        }
    }, [isRecording, isAudioEnabled, selectedAudioId]);

    const toggleVideo = useCallback(async () => {
        if (!isRecording || !streamRef.current) return;

        if (isVideoEnabled) {
            updateStreamTrack('video', null);
            setIsVideoEnabled(false);
        } else {
            try {
                const stream = await getMediaStream(false, selectedVideoId);
                const newTrack = stream.getVideoTracks()[0];
                if (newTrack) {
                    updateStreamTrack('video', newTrack);
                }
                setIsVideoEnabled(true);
            } catch (err) {
                console.error("Failed to re-enable video", err);
                setError("Failed to enable camera");
            }
        }
    }, [isRecording, isVideoEnabled, selectedVideoId]);

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
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        audioData,
        analyser: analyserRef.current,
        error,
        devices,
        selectedAudioId,
        setSelectedAudioId,
        selectedVideoId,
        setSelectedVideoId,
        checkPermissions,
        permissionError,
        stream // Return state
    };
};
