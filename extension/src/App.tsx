import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Radio, Activity, Bug, LogIn, Video, VideoOff, Target } from 'lucide-react';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { useAuth } from './hooks/useAuth';
import { useMissions } from './hooks/useMissions';
import { useSocket } from './hooks/useSocket';

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000';

function App() {
  const { isRecording, startRecording, stopRecording, toggleAudio, toggleVideo, isAudioEnabled, isVideoEnabled, audioData, error, devices, selectedAudioId, setSelectedAudioId, selectedVideoId, setSelectedVideoId, stream, checkPermissions, permissionError } = useMediaRecorder();
  const { isAuthenticated, isLoading, user, login, debugLogin } = useAuth();
  const { missions, isLoading: missionsLoading } = useMissions();
  const { socket, connectSocket, disconnectSocket, consumeAudio } = useSocket();
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [hurdles] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Audio Playback State
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (missions.length > 0 && !selectedMissionId) {
      setSelectedMissionId(missions[0].id);
    }
  }, [missions, selectedMissionId]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoEnabled]);

  // Audio Player Loop
  useEffect(() => {
    const processQueue = async () => {
      const chunk = consumeAudio();
      if (chunk) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;

        try {
          const binaryString = window.atob(chunk);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
          }

          const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
          audioBuffer.copyToChannel(float32, 0);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          const currentTime = ctx.currentTime;
          let startTime = nextStartTimeRef.current;
          if (startTime < currentTime) startTime = currentTime;

          source.start(startTime);
          nextStartTimeRef.current = startTime + audioBuffer.duration;

        } catch (e) {
          console.error("Error playing audio chunk", e);
        }
      }

      if (isRecording) {
        requestAnimationFrame(processQueue);
      }
    };

    if (isRecording) {
      processQueue();
    }

    return () => {
      if (!isRecording && audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }
    }
  }, [isRecording, consumeAudio]);

  const [pendingSession, setPendingSession] = useState(false);

  // Effect to actually start recording once socket is ready
  useEffect(() => {
    if (pendingSession && socket?.connected) {
      startRecording(socket).then(() => {
        setPendingSession(false);
      });
    }
  }, [pendingSession, socket, startRecording]);

  const toggleConnection = async () => {
    setSessionError(null);
    if (isRecording) {
      // Stopping
      stopRecording();
      disconnectSocket();
    } else {
      // Starting
      if (!selectedMissionId) {
        setSessionError("Please select a mission first.");
        return;
      }

      try {
        // Create Session on Backend
        const response = await fetch(`${DASHBOARD_URL}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ missionId: selectedMissionId })
        });

        if (!response.ok) {
          throw new Error('Failed to create session on backend');
        }

        const sessionData = await response.json();

        // Connect Socket
        connectSocket(sessionData.id);
        setPendingSession(true);

      } catch (err: any) {
        console.error("Failed to start session:", err);
        setSessionError(err.message || "Failed to start session");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center text-center gap-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-purple-500 w-10 h-10" />
          <h1 className="text-2xl font-bold tracking-tight">VibeCheck</h1>
        </div>

        <p className="text-gray-400 max-w-xs">
          Connect your account to start an autonomous testing session.
        </p>

        <button
          onClick={login}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full justify-center max-w-xs"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Dashboard
        </button>

        {/* Dev Mode Bypass */}
        <button
          onClick={debugLogin}
          className="text-xs text-gray-600 hover:text-gray-400 underline decoration-dotted transition-colors"
        >
          [DEV] Bypass Auth
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Only works with active session on localhost:3000
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-500 w-6 h-6" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight leading-none">VibeCheck</h1>
            {user && <span className="text-[10px] text-gray-400">Hi, {user.name.split(' ')[0]}</span>}
          </div>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${isRecording ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {isRecording ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </header>

      {/* Main Control */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-8 relative">

        {/* Settings Toggle */}
        <div className="absolute top-0 right-0">
          {/* We can place a settings button here if we want, or near the mic toggle */}
        </div>

        {/* Connection Ring */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isRecording ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-700'}`}></div>
          <button
            onClick={toggleConnection}
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center bg-gray-900 border-4 transition-all duration-300 shadow-2xl ${isRecording ? 'border-purple-500 shadow-purple-500/20' : 'border-gray-700 hover:border-gray-600'}`}
          >
            {isRecording ? (
              <Radio className="w-12 h-12 text-purple-500 animate-pulse" />
            ) : (
              <Radio className="w-12 h-12 text-gray-500" />
            )}
            <span className="mt-2 text-sm font-semibold tracking-widest uppercase text-gray-400">
              {isRecording ? 'LIVE' : 'Start'}
            </span>
          </button>
        </div>

        {/* Session Error */}
        {sessionError && (
          <div className="text-red-400 text-xs bg-red-900/20 px-3 py-1 rounded border border-red-800/50">
            {sessionError}
          </div>
        )}


        {/* Audio Visualizer Placeholder */}
        <div className="w-full h-16 bg-gray-800/50 rounded-lg flex items-end justify-center gap-1 overflow-hidden border border-gray-800/50 p-2">
          {error && (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="text-red-500 text-xs text-center">{error}</div>
              {error.includes('denied') && (
                <button
                  onClick={() => window.open(chrome.runtime.getURL('popup.html'), '_blank')}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 transition-colors"
                >
                  Open in Tab to Fix
                </button>
              )}
            </div>
          )}
          {!error && isRecording ? (
            Array.from({ length: 20 }).map((_, i) => {
              // Map visualizer data to height (simple scaling)
              // Data array is 32 items (fftSize/2), we use first 20
              const value = audioData[i] || 0;
              const height = Math.max(4, (value / 255) * 100);

              return (
                <div
                  key={i}
                  className="w-1 bg-purple-500 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${height}%`,
                    opacity: 0.5 + (value / 510) // Dynamic opacity
                  }}
                />
              )
            })
          ) : (
            <span className="text-gray-600 text-xs uppercase tracking-wider">Audio Inactive</span>
          )}
        </div>

        {/* Controls Grid */}
        <div className="flex flex-col gap-3 w-full">

          {/* Mission Selection */}
          <div className="flex items-center gap-2 w-full">
            <div className="p-3 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedMissionId}
                onChange={(e) => setSelectedMissionId(e.target.value)}
                disabled={isRecording || missionsLoading}
                className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate disabled:opacity-50"
              >
                {missionsLoading ? (
                  <option>Loading missions...</option>
                ) : missions.length === 0 ? (
                  <option value="">No Active Missions</option>
                ) : (
                  missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.name}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          </div>

          {/* Audio Input */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${!isAudioEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'}`}
            >
              {!isAudioEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Device Selection Dropdown or Permission Request */}
            <div className="relative flex-1">
              {devices.filter(d => d.kind === 'audioinput').length === 0 || permissionError ? (
                <button
                  onClick={() => {
                    if (permissionError) {
                      window.open(chrome.runtime.getURL('popup.html'), '_blank');
                    } else {
                      checkPermissions();
                    }
                  }}
                  className={`w-full text-xs font-medium rounded-lg border px-3 py-3 transition-colors flex items-center justify-center gap-2 ${permissionError ? 'bg-red-900/20 text-red-400 border-red-800/50 hover:bg-red-900/30' : 'bg-purple-900/20 text-purple-400 border-purple-800/50 hover:bg-purple-900/30'}`}
                >
                  {permissionError ? <Bug className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  {permissionError ? 'Microphone Blocked (Open Tab)' : 'Enable Microphone'}
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate"
                  >
                    {devices
                      .filter(d => d.kind === 'audioinput')
                      .map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${!isVideoEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'}`}
            >
              {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <div className="relative flex-1">
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate"
              >
                {devices
                  .filter(d => d.kind === 'videoinput')
                  .map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          {isVideoEnabled && isRecording && (
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-800 relative group">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white">
                Camera Preview
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Hurdles Log */}
      <section className="bg-gray-800/30 rounded-xl p-4 border border-gray-800 h-48 flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-gray-400 border-b border-gray-700/50 pb-2">
          <Bug className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Detected Hurdles</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {hurdles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
              <Activity className="w-8 h-8" />
              <p className="text-xs text-center">No hurdles detected.<br />Go break something.</p>
            </div>
          ) : (
            hurdles.map((msg, i) => (
              <div key={i} className="text-xs p-2 rounded bg-gray-800 border border-gray-700 text-red-300">
                {msg}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
export default App;
