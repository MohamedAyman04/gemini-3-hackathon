/// <reference types="chrome" />
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { downsample, convertFloat32ToInt16 } from '../utils/audioUtils';

export interface UseMediaRecorderReturn {
    isRecording: boolean;
    startRecording: (socket?: Socket | null) => Promise<void>;
    stopRecording: () => void;
    getRecordedBlob: () => Blob;
    toggleAudio: () => void;
    isAudioEnabled: boolean;
    audioData: Uint8Array;
    analyser: AnalyserNode | null;
    error: string | null;
    devices: MediaDeviceInfo[];
    selectedAudioId: string;
    setSelectedAudioId: (id: string) => void;
    checkPermissions: () => Promise<void>;
    permissionError: boolean;
    prepareStream: () => Promise<void>;
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioId, setSelectedAudioId] = useState<string>('');

    // Stream State
    const streamRef = useRef<MediaStream | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const prevAudioId = useRef(selectedAudioId);

    const animationFrameRef = useRef<number | null>(null);

    const [permissionError, setPermissionError] = useState<boolean>(false);

    const checkPermissions = useCallback(async () => {
        try {
            console.log("Requesting microphone permission...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            stream.getTracks().forEach(t => t.stop());
            setPermissionError(false);
            console.log("Microphone permission granted.");

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(allDevices);

            const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
            if (audioDevices.length > 0 && !selectedAudioId) {
                setSelectedAudioId(audioDevices[0].deviceId);
            }
        } catch (err: any) {
            console.error("Failed to get permissions:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message?.includes('The object can not be found')) {
                setPermissionError(true);
            }
        }
    }, [selectedAudioId]);

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

    const getMediaStream = async (audioId: string | boolean) => {
        const audioConstraints = typeof audioId === 'string'
            ? (audioId ? { deviceId: { exact: audioId } } : true)
            : audioId;

        return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });
    }

    const updateStreamTrack = (newTrack: MediaStreamTrack | null) => {
        if (!streamRef.current) return;

        const oldTracks = streamRef.current.getAudioTracks();
        oldTracks.forEach(t => {
            t.stop();
            streamRef.current?.removeTrack(t);
        });

        if (newTrack) {
            streamRef.current.addTrack(newTrack);
        }
    };

    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const prepareStream = useCallback(async () => {
        setError(null);
        try {
            console.log("Preparing stream: Requesting Display Media (Screen) + User Media (Mic)");

            // 1. Get Screen (Video)
            // Note: This MUST be triggered by a user action
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false // We capture mic separately
            });

            // 2. Get Mic (Audio)
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
                video: false
            });

            // 3. Combine
            const tracks = [
                ...screenStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ];

            const combinedStream = new MediaStream(tracks);
            streamRef.current = combinedStream;

            // Setup Analyzer immediately for UI feedback
            connectStreamToAnalyser(combinedStream);

            // Handle user stopping screen share via browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                console.log("User stopped screen sharing");
                stopRecording();
            };

        } catch (err: any) {
            console.error("Failed to prepare stream:", err);
            if (err.name === 'NotAllowedError') {
                setError('Permission denied for Screen/Mic.');
            } else {
                setError(err.message || 'Failed to capture screen.');
            }
            throw err;
        }
    }, [selectedAudioId]);

    const startRecording = useCallback(async (socket?: Socket | null) => {
        setError(null);
        try {
            if (!streamRef.current) {
                throw new Error("Stream not ready. Call prepareStream() first.");
            }

            const newStream = streamRef.current;

            // Ensure we are active
            if (newStream.getTracks().some(t => t.readyState === 'ended')) {
                throw new Error("Stream ended unexpectedly");
            }

            const tabs = await chrome.tabs.query({ active: true, currentWindow: false, windowType: 'normal' });
            const targetTab = tabs[0];
            if (targetTab?.id) {
                chrome.tabs.sendMessage(targetTab.id, {
                    type: 'START_RECORDING',
                    timestamp: Date.now()
                }).catch(() => { });
            }

            setIsRecording(true);

            // --- Full Video Recording (Archive) ---
            chunksRef.current = [];

            // Determine MIME type
            const videoTracks = newStream.getVideoTracks();
            const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
            let mimeType = 'video/webm;codecs=vp9';

            if (!hasVideo) {
                mimeType = 'audio/webm';
            } else if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; // Fallback
            }

            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = hasVideo ? 'video/mp4' : 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = ''; // Let browser choose default
            }

            console.log("Starting MediaRecorder with mimeType:", mimeType);

            // SYNC REFS
            prevAudioId.current = selectedAudioId;

            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(newStream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            mediaRecorder.start(1000); // chunk every second
            mediaRecorderRef.current = mediaRecorder;


            // --- Streaming Logic ---
            if (socket) {
                // 1. Audio Streaming
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }
                const ctx = audioContextRef.current;

                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const processSource = ctx.createMediaStreamSource(newStream);
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);

                    // AMPLIFY VOLUME (10x Gain)
                    for (let i = 0; i < inputData.length; i++) {
                        inputData[i] *= 2.0;
                    }

                    const downsampled = downsample(inputData, ctx.sampleRate, 16000);
                    const pcm16 = convertFloat32ToInt16(downsampled);
                    socket.emit('audio_chunk', pcm16.buffer);
                };

                processSource.connect(processor);
                processor.connect(ctx.destination);

                // 2. Video Streaming (Screen Share Frame)
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                    canvasRef.current.width = 1280; // 720p
                    canvasRef.current.height = 720;
                }
                const canvas = canvasRef.current;
                const canvasCtx = canvas.getContext('2d');

                const vid = document.createElement('video');
                vid.srcObject = newStream;
                vid.muted = true;
                await vid.play();

                videoIntervalRef.current = setInterval(() => {
                    if (!socket.connected || !canvasCtx) return;

                    if (vid.readyState === vid.HAVE_ENOUGH_DATA) {
                        canvasCtx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                        const base64 = dataUrl.split(',')[1];
                        socket.emit('screen_frame', { frame: base64 });
                    }
                }, 100); // 10 FPS
            }

        } catch (err: any) {
            console.error("Error starting recording:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setError('Microphone access denied. Open extension popup to grant permissions.');
            } else {
                setError(err.message || 'Failed to start recording');
            }
            cleanup();
            throw err;
        }
    }, [selectedAudioId, cleanup]);


    useEffect(() => {
        if (!isRecording) return;

        // Skip switch if devices haven't actually changed
        if (selectedAudioId === prevAudioId.current) {
            return;
        }

        const switchDevice = async () => {
            try {
                if (isAudioEnabled && selectedAudioId !== prevAudioId.current) {
                    console.log("Switching Audio Device to:", selectedAudioId);
                    const audioStream = await getMediaStream(selectedAudioId);
                    const newAudioTrack = audioStream.getAudioTracks()[0];
                    updateStreamTrack(newAudioTrack);
                    connectStreamToAnalyser(streamRef.current!);
                }
                prevAudioId.current = selectedAudioId;

            } catch (err) {
                console.error("Failed to switch device:", err);
                setError("Failed to switch input device");
            }
        };

        switchDevice();
    }, [selectedAudioId, isRecording, isAudioEnabled]);

    const toggleAudio = useCallback(async () => {
        if (!isRecording || !streamRef.current) return;

        if (isAudioEnabled) {
            updateStreamTrack(null);
            setIsAudioEnabled(false);
        } else {
            try {
                const stream = await getMediaStream(selectedAudioId);
                const newTrack = stream.getAudioTracks()[0];
                if (newTrack) {
                    updateStreamTrack(newTrack);
                    connectStreamToAnalyser(streamRef.current);
                }
                setIsAudioEnabled(true);
            } catch (err) {
                console.error("Failed to re-enable audio", err);
                setError("Failed to enable microphone");
            }
        }
    }, [isRecording, isAudioEnabled, selectedAudioId]);

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        cleanup();
    };


    const getRecordedBlob = useCallback(() => {
        return new Blob(chunksRef.current, { type: 'video/webm' });
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        getRecordedBlob,
        toggleAudio,
        isAudioEnabled,
        audioData,
        analyser: analyserRef.current,
        error,
        devices,
        selectedAudioId,
        setSelectedAudioId,
        checkPermissions,
        permissionError,
        prepareStream
    };
};
