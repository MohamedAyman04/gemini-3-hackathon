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
    prepareStream: () => Promise<void>;
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
    const prevAudioId = useRef(selectedAudioId);
    const prevVideoId = useRef(selectedVideoId);

    const animationFrameRef = useRef<number | null>(null);

    const [permissionError, setPermissionError] = useState<boolean>(false);

    const checkPermissions = useCallback(async () => {
        try {
            console.log("Requesting microphone permission...");
            // Try Audio ONLY first, as this might be what "used to work"
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // If audio works, we can try video or just treat it as success for now
            // stream.getTracks().forEach(t => t.stop()); // Don't stop yet if we want to enumerate? No, enumerate works without stream.
            stream.getTracks().forEach(t => t.stop());
            setPermissionError(false);
            console.log("Microphone permission granted.");

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
            console.error("Failed to get permissions:", err);
            // Only show the "Open in Tab" button if it's genuinely a permission/security issue or the specific Firefox DOMException
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message?.includes('The object can not be found')) {
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
            setStream(combinedStream);

            // Setup Analyzer immediately for UI feedback
            connectStreamToAnalyser(combinedStream);

            // Handle user stopping screen share via browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                console.log("User stopped screen sharing");
                stopRecording();
            };

        } catch (err: any) {
            console.error("Failed to prepare stream:", err);
            // Verify this works...
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

            // Final check
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                // Last resort for standard recording
                mimeType = hasVideo ? 'video/mp4' : 'audio/mp4';
                // Note: mp4 might not be supported in all MediaRecorder implementations, but let's try standard types if webm fails.
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = ''; // Let browser choose default
            }


            console.log("Starting MediaRecorder with mimeType:", mimeType);

            // SYNC REFS to prevent redundant switching in useEffect
            prevAudioId.current = selectedAudioId;
            prevVideoId.current = selectedVideoId;

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
                    console.log("AudioContext suspended, resuming...");
                    await ctx.resume();
                }
                console.log("AudioContext State:", ctx.state, "SampleRate:", ctx.sampleRate);

                // DEBUG AUDIO TRACKS
                const audioTracks = newStream.getAudioTracks();
                console.log("Audio Tracks:", audioTracks.map(t => ({
                    label: t.label,
                    enabled: t.enabled,
                    muted: t.muted,
                    readyState: t.readyState,
                    id: t.id
                })));

                if (audioTracks.length === 0) {
                    console.error("NO AUDIO TRACKS FOUND IN STREAM!");
                }

                const processSource = ctx.createMediaStreamSource(newStream);

                const processor = ctx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                let callbackCount = 0;

                processor.onaudioprocess = (e) => {
                    // if (!socket.connected) return; // Allow logging even if disconnected for debug
                    callbackCount++;
                    const inputData = e.inputBuffer.getChannelData(0);

                    // Always log the first 5 callbacks to prove connectivity
                    if (callbackCount <= 5) {
                        let rawSum = 0;
                        for (let i = 0; i < Math.min(100, inputData.length); i++) rawSum += Math.abs(inputData[i]);
                        console.log(`onaudioprocess #${callbackCount}: rawSum (first 100) = ${rawSum}`);
                    }

                    // AMPLIFY VOLUME (10x Gain) because input was extremely quiet (0.003 avg)
                    for (let i = 0; i < inputData.length; i++) {
                        inputData[i] *= 10.0;
                    }

                    // Simple silence detection for debugging
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i += 100) sum += Math.abs(inputData[i]);
                    if (sum > 0.01 && Math.random() < 0.05) {
                        console.log("Mic Input Activity Detected (Amplified)", sum);
                    }

                    const downsampled = downsample(inputData, ctx.sampleRate, 16000);
                    const pcm16 = convertFloat32ToInt16(downsampled);
                    socket.emit('audio_chunk', pcm16.buffer);
                };

                processSource.connect(processor);
                processor.connect(ctx.destination);

                // 2. Video Streaming (Low FPS)
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                    canvasRef.current.width = 640;
                    canvasRef.current.height = 360;
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
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                        const base64 = dataUrl.split(',')[1];
                        socket.emit('screen_frame', { frame: base64 });
                        // console.log("Sent frame size:", base64.length); 
                    }
                }, 500); // Reduced FPS to 2 for better performance
            }

        } catch (err: any) {
            console.error("Error starting recording:", err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                setError('Microphone access denied. Open extension popup to grant permissions.');
            } else {
                setError(err.message || 'Failed to start recording');
            }
            cleanup();
            throw err; // Propagate error so caller knows it failed
        }
    }, [selectedAudioId, selectedVideoId, cleanup]);


    useEffect(() => {
        if (!isRecording) return;

        // Skip switch if devices haven't actually changed
        if (selectedAudioId === prevAudioId.current && selectedVideoId === prevVideoId.current) {
            return;
        }

        const switchDevice = async () => {
            try {
                if (isAudioEnabled && selectedAudioId !== prevAudioId.current) {
                    console.log("Switching Audio Device to:", selectedAudioId);
                    const audioStream = await getMediaStream(selectedAudioId, false);
                    const newAudioTrack = audioStream.getAudioTracks()[0];
                    updateStreamTrack('audio', newAudioTrack);
                    connectStreamToAnalyser(streamRef.current!);
                }
                prevAudioId.current = selectedAudioId;

                // if (isVideoEnabled) ... (Video switching logic if uncommented later)
                prevVideoId.current = selectedVideoId;

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
        stream,
        prepareStream
    };
};
