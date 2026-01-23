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

export default function LiveSession({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const sessionId = unwrappedParams.sessionId;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<{ time: string, message: string, source: string }[]>([]);
  const [frictionScore, setFrictionScore] = useState(0);
  const [emotion, setEmotion] = useState<"Neutral" | "Frustrated" | "Confused">("Neutral");
  const [sessionData, setSessionData] = useState<any>(null);

  // Fetch session details for start time / metadata
  useEffect(() => {
    fetch(`http://localhost:5000/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => setSessionData(data))
      .catch(err => console.error("Failed to fetch session", err));
  }, [sessionId]);

  useEffect(() => {
    // Connect to backend
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Join as viewer
      socket.emit("join_session", { sessionId: sessionId, type: 'viewer' });
    });

    socket.on("ai_text", (data) => {
      addLog(data.text, "AI");
    });

    socket.on("ai_intervention", (data) => {
      addLog(`Intervention Triggered: ${data.type}`, "SYSTEM");
      setFrictionScore(prev => Math.min(100, prev + 10));
      setEmotion("Frustrated");
    });

    // Reset emotion after a while?
    // For now, let it stick.

    socket.on("ai_audio", () => {
      // Visual indicator could be added here
    });

    socket.on("screen_frame", (data: { frame: string }) => {
      const img = document.getElementById('live-feed') as HTMLImageElement;
      if (img) {
        img.src = `data:image/jpeg;base64,${data.frame}`;
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const addLog = (message: string, source: "AI" | "USER" | "SYSTEM") => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      source
    }].slice(-50)); // Keep last 50
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

      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
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
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'animate-ping bg-red-400' : 'bg-gray-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-red-500' : 'bg-gray-500'}`}></span>
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
            {/* Live Video Feed */}
            <img
              id="live-feed"
              className="absolute inset-0 w-full h-full object-contain bg-black"
              alt="Live Feed"
              style={{ display: isConnected ? 'block' : 'none' }}
            />

            <div className={`absolute inset-0 flex items-center justify-center bg-slate-900/50 ${isConnected ? 'hidden' : 'flex'}`}>
              <p className="text-gray-500 flex items-center gap-2">
                <VideoOff className="w-5 h-5" />
                Waiting for extension stream...
              </p>
            </div>

            {/* Webcam overlay */}
            <div className="absolute top-4 right-4 w-48 h-32 bg-slate-800 rounded-lg border border-white/10 shadow-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                User Webcam
              </div>
            </div>
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
                  {frictionScore}<span className="text-sm text-gray-500">/100</span>
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
                {logs.length === 0 && <div className="text-gray-500 text-center py-4">Waiting for event logs...</div>}
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
