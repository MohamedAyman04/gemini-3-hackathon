"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Maximize2,
  Mic,
  Video,
  VideoOff,
  Square,
  AlertTriangle,
  MessageSquare,
  Terminal,
  Activity,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import "rrweb-player/dist/style.css";

export default function LiveSession({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const sessionId = unwrappedParams.sessionId;

  const socketRef = useRef<Socket | null>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<
    { time: string; message: string; source: string }[]
  >([]);
  const [frictionScore, setFrictionScore] = useState(0);
  const [emotion, setEmotion] = useState<"Neutral" | "Frustrated" | "Confused">(
    "Neutral",
  );
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  // Fetch session details for start time / metadata
  useEffect(() => {
    fetch(`http://localhost:5000/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setSessionData(data);
        if (data.status === "COMPLETED") {
          setIsSessionEnded(true);
        }
      })
      .catch((err) => console.error("Failed to fetch session", err));
  }, [sessionId]);

  useEffect(() => {
    // Connect to backend
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      addLog("Connected to backend server", "SYSTEM");
      // Join as viewer
      socket.emit("join_session", { sessionId: sessionId, type: "viewer" });
    });

    socket.on("session_started", () => {
      addLog("Session started by host", "SYSTEM");
    });

    socket.on("session_ended", (data: { reason: string }) => {
      setIsSessionEnded(true);
      addLog(`Session Ended: ${data.reason}`, "SYSTEM");
      if (playerRef.current) playerRef.current.pause();
    });

    socket.on("ai_text", (data) => {
      addLog(data.text, "AI");
    });

    socket.on("ai_intervention", (data) => {
      addLog(`Intervention Triggered: ${data.type}`, "SYSTEM");
      setFrictionScore((prev) => Math.min(100, prev + 10));
      setEmotion("Frustrated");
    });

    let lastFrameLog = 0;
    socket.on("screen_frame", (data: { frame: string }) => {
      const img = document.getElementById("live-stream-feed") as HTMLImageElement;
      if (img) {
        img.src = `data:image/jpeg;base64,${data.frame}`;
      }

      const now = Date.now();
      if (now - lastFrameLog > 5000) {
        addLog("Received active webcam stream", "SYSTEM");
        lastFrameLog = now;
      }
    });

    let lastEventLog = 0;
    socket.on("rrweb_events", async (events: any[]) => {
      const now = Date.now();
      if (now - lastEventLog > 2000) {
        addLog(`Received ${events.length} UI activity events`, "USER");
        lastEventLog = now;
      }

      if (playerRef.current) {
        events.forEach((event) => {
          playerRef.current.addEvent(event);
        });
      } else {
        // Init player on first batch (ideally checks for snapshot)
        // We lazily init on first data
        if (events.length > 0) {
          addLog("Initializing UI replay player...", "SYSTEM");
          const { default: rrwebPlayer } = await import("rrweb-player");

          if (containerRef.current && !playerRef.current) {
            containerRef.current.innerHTML = ""; // clear waiting text
            playerRef.current = new rrwebPlayer({
              target: containerRef.current,
              props: {
                events: events,
                liveMode: true,
                autoPlay: true,
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
              },
            });

            addLog("UI Replay Player Ready", "SYSTEM");
          }
        }
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      if (playerRef.current) {
        // Cleanup? rrweb-player might not have a destroy property easily accessible or we just remove container content
        playerRef.current.pause();
        playerRef.current = null;
      }
    };
  }, [sessionId]);

  const addLog = (message: string, source: "AI" | "USER" | "SYSTEM") => {
    setLogs((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message,
          source,
        },
      ].slice(-50),
    ); // Keep last 50
  };

  const handleTriggerAI = async () => {
    // Legacy test trigger - keeping for dev but could remove
    alert("This feature is for dev testing only.");
  };

  const handleEndSession = () => {
    router.push("/");
  };

  // Calculate elapsed time
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!sessionData?.createdAt) return;

    const interval = setInterval(() => {
      const start = new Date(sessionData.createdAt).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);

      const h = Math.floor(diff / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "animate-ping bg-red-400" : "bg-gray-400"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? "bg-red-500" : "bg-gray-500"}`}
              ></span>
            </span>
            Live Session: {sessionData?.mission?.name || "Loading..."}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-400 text-sm">
              Session ID: #{sessionId.slice(0, 8)}... • {elapsed} elapsed
            </p>
            <Badge
              variant={isConnected ? "success" : "secondary"}
              className="text-[10px] py-0"
            >
              {isConnected ? "WEBSOCKET LIVE" : "CONNECTING..."}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
          >
            <Square className="w-4 h-4 mr-2 text-red-500" /> Exit View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Main Screen Stream */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative flex-1 rounded-2xl bg-black border border-white/10 overflow-hidden group">
            {/* Live Screen Stream Container */}
            <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
              <img
                id="live-stream-feed"
                className="w-full h-full object-contain"
                alt="Waiting for Live Stream..."
              />
            </div>

            {/* Overlay Status Text */}
            {(!isConnected || isSessionEnded) && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none z-10 bg-black/50">
                {!isConnected && !isSessionEnded && "Connecting to Server..."}
              </div>
            )}

            {/* Session Ended Overlay */}
            {isSessionEnded && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white space-y-4">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-2" />
                <h2 className="text-2xl font-bold">Session Ended</h2>
                <p className="text-gray-400 max-w-md text-center">
                  The host has disconnected or the session has been marked as
                  completed.
                </p>
                <div className="flex gap-4 mt-4">
                  <Button onClick={() => router.push("/")} variant="secondary">
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Agent Insights Bar */}
          <div className="h-24 rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Current Emotion
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${emotion === "Neutral" ? "bg-blue-500" : "bg-orange-500"
                      }`}
                  />
                  <span className="font-semibold text-lg">{emotion}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Friction Score
                </p>
                <div className="mt-1 text-lg font-mono text-white">
                  {frictionScore}
                  <span className="text-sm text-gray-500">/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Logs & Events */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="flex-1 border-white/5 flex flex-col bg-slate-900/40">
            <CardHeader className="py-3 px-4 border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-violet-400" />
                Live Agent Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {logs.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    Waiting for event logs...
                  </div>
                )}
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="text-gray-300 border-l-2 border-white/10 pl-2 py-0.5"
                  >
                    <span className="opacity-50 block mb-0.5">
                      {log.time} [{log.source}]
                    </span>
                    <span
                      className={
                        log.source === "AI"
                          ? "text-violet-300"
                          : log.source === "SYSTEM"
                            ? "text-orange-300"
                            : "text-emerald-300"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
