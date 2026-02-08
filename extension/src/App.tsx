import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Radio, Activity, LogIn, Target } from "lucide-react";
import { useMediaRecorder } from "./hooks/useMediaRecorder";
import { useAuth } from "./hooks/useAuth";
import { useMissions } from "./hooks/useMissions";
import { useSocket } from "./hooks/useSocket";
import Image from "next/image";
import { REST_API_URL, APP_BASE_URL } from "./config";

function App() {
  const {
    missions,
    isLoading: missionsLoading,
    createMission,
    error: missionsError,
    refresh: refreshMissions,
  } = useMissions();
  const {
    isAuthenticated,
    isLoading,
    login,
    debugLogin,
    error: authError,
    refresh: refreshAuth,
  } = useAuth();
  const {
    socket,
    isConnected: isSocketConnected,
    connectSocket,
    disconnectSocket,
    consumeAudio,
    // clearQueue,
    messages,
  } = useSocket();
  const {
    isRecording,
    startRecording,
    stopRecording,
    getRecordedBlob,
    toggleAudio,
    isAudioEnabled,
    audioData,
    error,
    devices,
    selectedAudioId,
    setSelectedAudioId,

    prepareStream,
  } = useMediaRecorder();

  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(
    null,
  );
  const [isEnding, setIsEnding] = useState(false);

  // New Mission Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionContext, setNewMissionContext] = useState("");

  // Audio Playback State
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (missions.length > 0 && !selectedMissionId) {
      setSelectedMissionId(missions[0].id);
    }
  }, [missions, selectedMissionId]);

  // Audio Player Loop
  useEffect(() => {
    // We start the loop, but processing only happens when isRecording is true
    let animationFrameId: number;

    const processQueue = async () => {
      // 1. Check if AudioContext is ready/resumed
      if (audioContextRef.current?.state === "suspended") {
        try {
          await audioContextRef.current.resume();
          console.log("Resumed AudioContext");
        } catch (e) {
          /* ignore */
        }
      }

      // 2. Consume Audio
      const chunk = consumeAudio();
      if (chunk && audioContextRef.current) {
        // Did we get a Clear signal?
        // useSocket clears the queue, we just need to ensure we don't play stale chunks?
        // Since we consume one by one, if queue is cleared, consumeAudio returns undefined next time.
        // So we are good.

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

          // console.log("Playing Audio Chunk", startTime);
          source.start(startTime);
          nextStartTimeRef.current = startTime + audioBuffer.duration;
        } catch (e) {
          console.error("Error playing audio chunk", e);
        }
      }

      if (isRecording) {
        animationFrameId = requestAnimationFrame(processQueue);
      }
    };

    if (isRecording) {
      processQueue();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isRecording, consumeAudio]);

  // Clean AudioContext on Unmount only, NOT on stopRecording (to allow reuse?)
  // Actually documentation says close it.
  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Watch for "ai_interrupted" via socket side-effect (or just check queue clear)
  // useSocket clears queue internaly. We just need to stop CURRENTLY playing audio?
  // Web Audio API text scheduling is hard to stop individually without disconnecting nodes.
  // For simplicity, we just clear the queue for *future* chunks.
  // If we wanted to stop immediate sound, we'd need to track active nodes.
  // Let's stick to queue clearing for now as per plan.

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

      // Initialize Audio Context inside User Gesture
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

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

      // 1. Prepare Stream (MUST happen first during User Gesture for Screen Share)
      try {
        await prepareStream();
      } catch (streamErr) {
        console.error("Stream preparation failed:", streamErr);
        // If they cancelled screen share, we stop.
        return;
      }

      // 2. Create Session on Backend
      const response = await fetch(`${REST_API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ missionId: missionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session on backend");
      }

      const sessionData = await response.json();
      setCurrentSessionId(sessionData.id);

      // 3. Connect Socket
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
      // Don't disconnect socket yet, let finalize finish first to prevent premature backend cleanup
      // disconnectSocket();

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

      const response = await fetch(
        `${REST_API_URL}/sessions/${currentSessionId}/finalize`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      if (response.ok) {
        setCompletedSessionId(currentSessionId);
      }

      setCurrentSessionId(null);
      setSessionError(null);
    } catch (err: any) {
      console.error("Failed to finalize session:", err);
      setSessionError("Failed to upload session data. please check console.");
    } finally {
      setIsEnding(false);
      disconnectSocket(); // Now disconnect
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
      <div className="min-h-screen bg-linen text-midnight p-8 flex flex-col items-center justify-center text-center gap-8">
        <div className="flex flex-col items-center gap-4 mb-4">
          <img
            src="/vibecheck2.svg"
            alt="VibeCheck"
            className="w-20 h-20 animate-glow rounded-[32px] p-4 bg-white shadow-2xl border border-midnight/5"
          />
          <h1 className="text-4xl font-black tracking-tight text-midnight uppercase">
            VibeCheck
          </h1>
        </div>

        <p className="text-muted-foreground max-w-xs font-medium">
          Connect your account to start an autonomous testing session.
        </p>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-xs max-w-xs mb-4">
            <strong>Auth Error:</strong> {authError}
            <button onClick={refreshAuth} className="ml-2 underline font-bold">
              Retry
            </button>
          </div>
        )}

        <button
          onClick={login}
          className="flex items-center gap-2 bg-lavender hover:opacity-90 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest transition-all w-full justify-center max-w-xs shadow-2xl shadow-lavender/40"
        >
          <LogIn className="w-5 h-5" />
          Sign in
        </button>

        {/* Dev Mode Bypass */}
        <button
          onClick={debugLogin}
          className="text-xs text-gray-600 hover:text-gray-400 underline decoration-dotted transition-colors"
        >
          [DEV] Bypass Auth
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Only works with active session on {APP_BASE_URL}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen text-midnight font-sans flex flex-col">
      {/* Header */}
      {/* Header */}
      <header className="w-full bg-midnight shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative z-50">
        <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center flex-row justify-center">
                <Image
                  src="/vibecheck2.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  style={{ position: "relative", bottom: "2px" }}
                />
                <h1 className="text-lg font-black tracking-tight leading-none uppercase text-linen ml-3">
                  ibeCheck
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider">
                  Sharing
                </span>
              </div>
            )}
            {isRecording && currentSessionId && (
              <button
                onClick={() =>
                  window.open(
                    `${APP_BASE_URL}/live/${currentSessionId}`,
                    "_blank",
                  )
                }
                className="text-[9px] font-black bg-lavender/20 text-lavender px-3 py-1.5 rounded-xl border border-lavender/30 hover:bg-lavender hover:text-white transition-all duration-300 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Target className="w-3 h-3" />
                Live
              </button>
            )}
            <div
              className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all duration-500 border ${
                isRecording
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isRecording
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "bg-red-400"
                }`}
              />
              {isRecording ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Control */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center gap-8 py-8 px-6 relative">
        {completedSessionId ? (
          <div className="flex flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center border-4 border-green-100 mb-2 shadow-sm">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-midnight mb-2">
                Session Completed!
              </h2>
              <p className="text-gray-500 text-sm max-w-[200px] mx-auto">
                Your session has been recorded and analyzed.
              </p>
            </div>

            <button
              onClick={() =>
                window.open(
                  `${APP_BASE_URL}/sessions/${completedSessionId}`,
                  "_blank",
                )
              }
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-colors w-full flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Target className="w-4 h-4" />
              View Report
            </button>

            <button
              onClick={() => setCompletedSessionId(null)}
              className="text-gray-500 hover:text-purple-600 text-sm font-medium underline decoration-dotted"
            >
              Start New Session
            </button>
          </div>
        ) : (
          <>
            {/* Start/Stop Button */}
            <div className="relative group">
              <button
                onClick={toggleConnection}
                disabled={isEnding}
                className={`
                    w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 border-[6px]
                    ${
                      isRecording
                        ? "bg-white border-red-500 text-red-500 hover:bg-red-50 shadow-red-500/20"
                        : "bg-white border-indigo-500 text-indigo-600 hover:bg-indigo-50 shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    }
                    ${isEnding ? "opacity-80 cursor-not-allowed border-gray-400 text-gray-400" : ""}
                  `}
              >
                {isEnding ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                ) : isRecording ? (
                  <>
                    <div className="w-10 h-10 bg-red-500 rounded-lg animate-pulse mb-2" />
                    <span className="text-sm font-bold tracking-widest">
                      STOP
                    </span>
                  </>
                ) : (
                  <>
                    <Radio className="w-10 h-10 mb-2" />
                    <span className="text-sm font-bold tracking-widest">
                      START
                    </span>
                  </>
                )}
              </button>
              {/* Subtle Glow Effect */}
              <div
                className={`absolute -inset-4 rounded-full blur-2xl opacity-20 -z-10 transition-colors duration-500 ${isRecording ? "bg-red-500" : "bg-indigo-500"}`}
              ></div>
            </div>

            {/* Session Error */}
            {sessionError && (
              <div className="text-red-600 text-xs bg-red-50 px-4 py-3 rounded-xl border border-red-200 font-medium w-full text-center shadow-sm">
                {sessionError}
              </div>
            )}

            {/* Audio Visualizer */}
            <div className="w-full h-14 bg-white rounded-2xl flex items-center justify-center gap-1 overflow-hidden border border-gray-100 p-3 shadow-sm">
              {error && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="text-red-500 text-xs text-center font-medium">
                    {error}
                  </div>
                  {error.includes("denied") && (
                    <button
                      onClick={() =>
                        window.open(
                          chrome.runtime.getURL("popup.html"),
                          "_blank",
                        )
                      }
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded border border-gray-300 transition-colors"
                    >
                      Open in Tab to Fix
                    </button>
                  )}
                </div>
              )}
              {!error && isRecording ? (
                Array.from({ length: 24 }).map((_, i) => {
                  const value = audioData[i] || 0;
                  const height = Math.max(15, (value / 255) * 100);

                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${height}%`,
                        opacity: 0.3 + value / 510,
                      }}
                    />
                  );
                })
              ) : (
                <div className="flex items-center gap-2 opacity-40">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ">
                    Ready to Record
                  </span>
                </div>
              )}
            </div>

            {/* Controls Grid */}
            <div className="flex flex-col gap-4 w-full">
              {/* Mission Selection */}
              {!isRecording && (
                <div className="w-full space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                    Select Mission
                  </label>
                  {isCreating ? (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                      <input
                        type="text"
                        placeholder="Mission Name"
                        className="w-full bg-gray-50 text-sm p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                        value={newMissionName}
                        onChange={(e) => setNewMissionName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Context (Optional)"
                        className="w-full bg-gray-50 text-sm p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                        value={newMissionContext}
                        onChange={(e) => setNewMissionContext(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsCreating(false)}
                          className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-3.5 bg-white text-indigo-600 border border-gray-200 rounded-xl shadow-sm">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="relative flex-1 group">
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-indigo-500 transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                        <select
                          value={selectedMissionId}
                          onChange={(e) => {
                            if (e.target.value === "NEW") {
                              window.open(
                                `${APP_BASE_URL}/missions/new`,
                                "_blank",
                              );
                            } else {
                              setSelectedMissionId(e.target.value);
                            }
                          }}
                          disabled={missionsLoading}
                          className="w-full bg-white text-sm text-gray-800 rounded-xl border border-gray-200 pl-4 pr-10 py-3.5 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 appearance-none truncate disabled:opacity-50 font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                          <option value="" className="text-gray-400">
                            Choose a mission...
                          </option>
                          <option
                            value="NEW"
                            className="text-indigo-600 font-bold bg-indigo-50"
                          >
                            + Create New Mission
                          </option>
                          {missions.map((mission) => (
                            <option
                              key={mission.id}
                              value={mission.id}
                              className="text-gray-900"
                            >
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
              <div className="w-full space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Input Source
                </label>
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={toggleAudio}
                    className={`p-3.5 rounded-xl transition-colors flex-shrink-0 border shadow-sm ${!isAudioEnabled ? "bg-red-50 text-red-500 hover:bg-red-100 border-red-200" : "bg-white text-indigo-600 hover:text-indigo-700 border-gray-200 hover:border-gray-300"}`}
                  >
                    {!isAudioEnabled ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  {/* Microphone Selection */}
                  <div className="relative flex-1 group">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-indigo-500 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      className="w-full bg-white text-sm text-gray-800 rounded-xl border border-gray-200 pl-4 pr-10 py-3.5 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 appearance-none truncate font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                      disabled={!isAudioEnabled}
                    >
                      {devices
                        .filter((device) => device.kind === "audioinput")
                        .map((device) => (
                          <option
                            key={device.deviceId}
                            value={device.deviceId}
                            className="text-gray-900"
                          >
                            {device.label ||
                              `Microphone ${device.deviceId.slice(0, 5)}...`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Live Chat / Events */}
      <section className="w-full max-w-md mx-auto px-6 pb-6">
        <div className="bg-white rounded-[32px] p-6 border border-gray-200 h-64 flex flex-col shadow-lg">
          <div className="flex items-center gap-3 mb-4 text-midnight border-b border-gray-100 pb-4">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              Live Interaction
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
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
                    className={`max-w-[85%] text-xs p-3 rounded-2xl ${
                      msg.source === "ai"
                        ? "bg-indigo-50 text-indigo-800 rounded-tl-none border border-indigo-100"
                        : "bg-gray-100 text-gray-700 rounded-tr-none border border-gray-200"
                    }`}
                  >
                    {msg.source === "ai" && (
                      <span className="block text-[9px] text-indigo-500 font-black mb-1 tracking-wider">
                        GEMINI
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
export default App;
