import { useRef, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  Radio,
  Activity,
  Bug,
  LogIn,
  Video,
  VideoOff,
  Target,
} from "lucide-react";
import { useMediaRecorder } from "./hooks/useMediaRecorder";
import { useAuth } from "./hooks/useAuth";
import { useMissions } from "./hooks/useMissions";
import { useSocket } from "./hooks/useSocket";

const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5000";

function App() {
  const { missions, isLoading: missionsLoading, createMission } = useMissions();
  const { isAuthenticated, isLoading, user, login, debugLogin } = useAuth();
  const {
    socket,
    isConnected: isSocketConnected,
    connectSocket,
    disconnectSocket,
    consumeAudio,
    messages,
  } = useSocket();
  const {
    isRecording,
    startRecording,
    stopRecording,
    getRecordedBlob,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    audioData,
    error,
    devices,
    selectedAudioId,
    setSelectedAudioId,
    selectedVideoId,
    setSelectedVideoId,
    stream,
    checkPermissions,
    permissionError,
  } = useMediaRecorder();

  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  // New Mission Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionContext, setNewMissionContext] = useState("");

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
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isRecording, consumeAudio]);

  const [pendingSession, setPendingSession] = useState(false);

  // Effect to actually start recording once socket is ready
  useEffect(() => {
    if (pendingSession && isSocketConnected) {
      const timer = setTimeout(() => {
        startRecording(socket)
          .then(() => {
            // Signal Content Script on the active tab
            chrome.tabs
              .query({
                active: true,
                currentWindow: false,
                windowType: "normal",
              })
              .then((tabs) => {
                if (tabs[0]?.id) {
                  console.log(
                    "App: Sending START_RECORDING to tab",
                    tabs[0].id,
                  );
                  chrome.tabs
                    .sendMessage(tabs[0].id, {
                      type: "START_RECORDING",
                      timestamp: Date.now(),
                    })
                    .catch((e) =>
                      console.warn(
                        "Failed to notify tab of recording start",
                        e,
                      ),
                    );
                }
              });
            setPendingSession(false);
          })
          .catch((e) => {
            console.error("Failed to start recording session:", e);
            setPendingSession(false);
            setSessionError(
              "Failed to start recording. Please check permissions.",
            );
          });
      }, 500); // Small debounce to ensure socket stability and prevent double-trigger
      return () => clearTimeout(timer);
    }
  }, [pendingSession, isSocketConnected, socket, startRecording]);

  const startSession = async () => {
    if (!selectedMissionId && !isCreating) {
      setSessionError("Please select a mission first.");
      return;
    }

    try {
      let missionId = selectedMissionId;

      // Create Mission if needed
      if (isCreating) {
        if (!newMissionName) {
          setSessionError("Mission name is required");
          return;
        }
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: false,
          windowType: "normal",
        });
        const url = tabs[0]?.url || "";
        const newMission = await createMission(
          newMissionName,
          newMissionContext,
          url,
        );
        missionId = newMission.id;
        setSelectedMissionId(missionId);
        setIsCreating(false);
      }

      // Create Session on Backend
      const response = await fetch(`${DASHBOARD_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ missionId: missionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session on backend");
      }

      const sessionData = await response.json();
      setCurrentSessionId(sessionData.id);

      // Connect Socket
      connectSocket(sessionData.id);
      setPendingSession(true);
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setSessionError(err.message || "Failed to start session");
    }
  };

  useEffect(() => {
    console.log("Pending Session Effect:", {
      pendingSession,
      socketConnected: socket?.connected,
    });
  }, [pendingSession, socket]);

  // Forward rrweb events from Content Script to Backend
  useEffect(() => {
    const handleMessage = (message: any, _sender: any, _sendResponse: any) => {
      if (message.type === "RRWEB_EVENTS") {
        if (isRecording && socket?.connected) {
          socket.emit("rrweb_events", message.events);
          // console.log(`Forwarded ${message.events.length} rrweb events`);
        }
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [isRecording, socket]);

  const endSession = async () => {
    if (!currentSessionId) return;
    setIsEnding(true);
    try {
      // 1. Stop Recording Local & Remote
      stopRecording();
      disconnectSocket();

      // 2. Get Events from Content Script
      // Query ALL active tabs in normal windows to find the one recording
      const tabs = await chrome.tabs.query({
        active: true,
        windowType: "normal",
      });
      let logs = [];

      for (const tab of tabs) {
        if (!tab.id) continue;
        try {
          console.log("App: Attempting to STOP_RECORDING on tab", tab.id);
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: "STOP_RECORDING",
          });
          if (response && response.events) {
            logs = response.events;
            console.log(
              `VibeCheck: Retrieved ${logs.length} events from tab ${tab.id}`,
            );
            break;
          }
        } catch (e) {
          // Continue to next tab
        }
      }

      // 3. Get Video Blob (Wait a bit for Recorder to finalize)
      await new Promise((r) => setTimeout(r, 500));
      const videoBlob = getRecordedBlob();

      // 4. Upload
      const formData = new FormData();
      if (videoBlob.size > 0) {
        formData.append("video", videoBlob, "session.webm");
      }
      formData.append("logs", JSON.stringify(logs));

      await fetch(`${DASHBOARD_URL}/sessions/${currentSessionId}/finalize`, {
        method: "POST",
        body: formData,
      });

      setCurrentSessionId(null);
      setSessionError(null);
    } catch (err: any) {
      console.error("Failed to finalize session:", err);
      setSessionError("Failed to upload session data. please check console.");
    } finally {
      setIsEnding(false);
    }
  };

  const toggleConnection = async () => {
    setSessionError(null);
    if (isRecording) {
      await endSession();
    } else {
      await startSession();
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
            <h1 className="text-lg font-bold tracking-tight leading-none">
              VibeCheck
            </h1>
            {user && (
              <span className="text-[10px] text-gray-400">
                Hi, {user.name.split(" ")[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && currentSessionId && (
            <button
              onClick={() =>
                window.open(
                  `http://localhost:3000/live/${currentSessionId}`,
                  "_blank",
                )
              }
              className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-800 hover:bg-purple-900 hover:text-white transition-colors flex items-center gap-1"
            >
              <Target className="w-3 h-3" />
              View Live
            </button>
          )}
          <div
            className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${isRecording ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${isRecording ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            />
            {isRecording ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </header>

      {/* Main Control */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-8 relative">
        {/* Connection Ring */}
        <div className="relative group">
          <div
            className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isRecording ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gray-700"}`}
          ></div>
          <button
            onClick={toggleConnection}
            disabled={isEnding}
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center bg-gray-900 border-4 transition-all duration-300 shadow-2xl ${isRecording ? "border-red-500 shadow-red-500/20" : "border-purple-500 hover:border-purple-400"}`}
          >
            {isEnding ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : isRecording ? (
              <>
                <div className="w-12 h-12 bg-red-500 rounded-lg animate-pulse mb-2" />
                <span className="text-sm font-bold text-red-500">STOP</span>
              </>
            ) : (
              <>
                <Radio className="w-12 h-12 text-purple-500" />
                <span className="mt-2 text-sm font-semibold tracking-widest uppercase text-gray-400">
                  Start
                </span>
              </>
            )}
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
              {error.includes("denied") && (
                <button
                  onClick={() =>
                    window.open(chrome.runtime.getURL("popup.html"), "_blank")
                  }
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 transition-colors"
                >
                  Open in Tab to Fix
                </button>
              )}
            </div>
          )}
          {!error && isRecording ? (
            Array.from({ length: 20 }).map((_, i) => {
              const value = audioData[i] || 0;
              const height = Math.max(4, (value / 255) * 100);

              return (
                <div
                  key={i}
                  className="w-1 bg-purple-500 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${height}%`,
                    opacity: 0.5 + value / 510,
                  }}
                />
              );
            })
          ) : (
            <span className="text-gray-600 text-xs uppercase tracking-wider">
              Audio Inactive
            </span>
          )}
        </div>

        {/* Controls Grid */}
        <div className="flex flex-col gap-3 w-full">
          {/* Mission Selection */}
          {!isRecording && (
            <div className="w-full space-y-2">
              {isCreating ? (
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
                  <input
                    type="text"
                    placeholder="Mission Name"
                    className="w-full bg-gray-900 text-sm p-2 rounded border border-gray-700 focus:border-purple-500 outline-none"
                    value={newMissionName}
                    onChange={(e) => setNewMissionName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Context (Optional)"
                    className="w-full bg-gray-900 text-sm p-2 rounded border border-gray-700 focus:border-purple-500 outline-none"
                    value={newMissionContext}
                    onChange={(e) => setNewMissionContext(e.target.value)}
                  />
                  <button
                    onClick={() => setIsCreating(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <div className="p-3 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={selectedMissionId}
                      onChange={(e) => {
                        if (e.target.value === "NEW") setIsCreating(true);
                        else setSelectedMissionId(e.target.value);
                      }}
                      disabled={missionsLoading}
                      className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate disabled:opacity-50"
                    >
                      <option value="">Select a Mission...</option>
                      <option value="NEW">+ Create New Mission</option>
                      {missions.map((mission) => (
                        <option key={mission.id} value={mission.id}>
                          {mission.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio Input */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${!isAudioEnabled ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"}`}
            >
              {!isAudioEnabled ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Device Selection Dropdown or Permission Request */}
            <div className="relative flex-1">
              {devices.filter((d) => d.kind === "audioinput").length === 0 ||
              permissionError ? (
                <button
                  onClick={() => {
                    if (permissionError) {
                      window.open(
                        chrome.runtime.getURL("popup.html"),
                        "_blank",
                      );
                    } else {
                      checkPermissions();
                    }
                  }}
                  className={`w-full text-xs font-medium rounded-lg border px-3 py-3 transition-colors flex items-center justify-center gap-2 ${permissionError ? "bg-red-900/20 text-red-400 border-red-800/50 hover:bg-red-900/30" : "bg-purple-900/20 text-purple-400 border-purple-800/50 hover:bg-purple-900/30"}`}
                >
                  {permissionError ? (
                    <Bug className="w-3 h-3" />
                  ) : (
                    <MicOff className="w-3 h-3" />
                  )}
                  {permissionError
                    ? "Microphone Blocked (Open Tab)"
                    : "Enable Microphone"}
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate"
                  >
                    {devices
                      .filter((d) => d.kind === "audioinput")
                      .map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label ||
                            `Microphone ${device.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${!isVideoEnabled ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"}`}
            >
              {!isVideoEnabled ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </button>

            <div className="relative flex-1">
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full bg-gray-800 text-xs text-gray-300 rounded-lg border border-gray-700 px-3 py-3 focus:outline-none focus:border-purple-500 appearance-none truncate"
              >
                {devices
                  .filter((d) => d.kind === "videoinput")
                  .map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label ||
                        `Camera ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
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

      {/* Live Chat / Events */}
      <section className="bg-gray-800/30 rounded-xl p-4 border border-gray-800 h-48 flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-gray-400 border-b border-gray-700/50 pb-2">
          <Activity className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Live Interaction
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
              <Activity className="w-8 h-8" />
              <p className="text-xs text-center">Waiting for activity...</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.source === "ai" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] text-xs p-2 rounded-lg ${
                    msg.source === "ai"
                      ? "bg-purple-900/30 border border-purple-800/50 text-purple-200 rounded-tl-none"
                      : "bg-gray-800 border border-gray-700 text-gray-300 rounded-tr-none"
                  }`}
                >
                  {msg.source === "ai" && (
                    <span className="block text-[10px] text-purple-400 font-bold mb-1">
                      GEMINI
                    </span>
                  )}
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
export default App;
