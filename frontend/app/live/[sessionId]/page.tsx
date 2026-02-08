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
  Globe,
  Clock,
  Shield,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import "rrweb-player/dist/style.css";
import { Sidebar } from "@/components/layout/Sidebar";
import Image from "next/image";
import { getSession } from "@/lib/api";

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

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Fetch session details
  useEffect(() => {
    getSession(sessionId)
      .then((data) => {
        setSessionData(data);
        if (data.status === "COMPLETED") {
          setIsSessionEnded(true);
        }
      })
      .catch((err) => console.error("Failed to fetch session", err));
  }, [sessionId]);

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000",
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      addLog("Direct link established", "SYSTEM");
      socket.emit("join_session", { sessionId: sessionId, type: "viewer" });
    });

    socket.on("session_started", () => {
      addLog("AI Agent initialized mission", "SYSTEM");
    });

    socket.on("session_ended", (data: { reason: string }) => {
      setIsSessionEnded(true);
      addLog(`Mission Terminated: ${data.reason}`, "SYSTEM");
      if (playerRef.current) playerRef.current.pause();
    });

    socket.on("ai_text", (data) => {
      addLog(data.text, "AI");
    });

    const playAudioChunk = (base64Audio: string, rate: number = 16000) => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: rate });
        }
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }

        const ctx = audioContextRef.current;
        const binaryString = window.atob(base64Audio);
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

        const audioBuffer = ctx.createBuffer(1, float32.length, rate);
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
    };

    socket.on("user_audio", (chunk: ArrayBuffer) => {
      const base64 = btoa(
        new Uint8Array(chunk).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      playAudioChunk(base64, 16000);
    });

    socket.on("ai_audio", (data: { audio: string }) => {
      playAudioChunk(data.audio, 24000);
    });

    socket.on("ai_intervention", (data) => {
      addLog(`Intervention: ${data.type}`, "SYSTEM");
      setFrictionScore((prev) => Math.min(100, prev + 15));
      setEmotion("Frustrated");
    });

    socket.on("screen_frame", (data: { frame: string }) => {
      const img = document.getElementById(
        "live-stream-feed",
      ) as HTMLImageElement;
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
    setLogs((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message,
          source,
        },
      ].slice(-50),
    );
  };

  const handleEndSession = () => {
    router.push("/live");
  };

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
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/live")}
                className="rounded-xl hover:bg-linen font-bold text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-xl font-black text-midnight flex items-center gap-3">
                  {sessionData?.mission?.name || "Initializing..."}
                  {isConnected && (
                    <Badge
                      variant="success"
                      className="animate-pulse py-0 px-2 text-[10px]"
                    >
                      LIVE
                    </Badge>
                  )}
                </h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {elapsed}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Agent X-1
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
                className="rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/5 font-black uppercase tracking-widest text-[10px]"
              >
                <Square size={14} className="mr-2" /> Stop Observing
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
            {/* Primary Feed */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="relative flex-1 bg-midnight rounded-[40px] border-4 border-midnight shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 flex items-center justify-center bg-midnight/80">
                  <img
                    id="live-stream-feed"
                    className="max-h-full max-w-full object-contain"
                    alt="Agent Visual Stream"
                  />
                </div>

                {/* Buffering Overlay */}
                {(!isConnected || isSessionEnded) && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-midnight/90 backdrop-blur-md">
                    {isSessionEnded ? (
                      <div className="text-center space-y-6">
                        <div className="p-6 bg-red-500/10 rounded-full inline-block">
                          <AlertTriangle size={48} className="text-red-500" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-3xl font-black text-linen">
                            Mission Terminated
                          </h2>
                          <p className="text-slate max-w-xs mx-auto">
                            This session has been completed and is no longer
                            broadcasting.
                          </p>
                        </div>
                        <Button
                          onClick={() => router.push("/")}
                          className="rounded-2xl h-12 px-8"
                        >
                          Back to Control
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-lavender/10 border-t-lavender rounded-full animate-spin" />
                        <p className="text-slate font-black uppercase tracking-widest text-xs animate-pulse font-mono">
                          Resuming encrypted feed...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Unmute Invite */}
                {isConnected &&
                  !isSessionEnded &&
                  audioContextRef.current?.state === "suspended" && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-midnight/40 backdrop-blur-sm">
                      <Button
                        onClick={() => audioContextRef.current?.resume()}
                        className="rounded-[24px] px-8 h-16 text-lg font-black shadow-2xl shadow-lavender/30 bg-lavender"
                      >
                        <Mic className="mr-3" /> Unmute Agent Stream
                      </Button>
                    </div>
                  )}

                {/* HUD Overlays */}
                <div className="absolute top-8 left-8 p-4 bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-lavender rounded-lg">
                      <Activity size={20} className="text-linen" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate uppercase tracking-widest">
                        Target URL
                      </p>
                      <p className="text-sm font-bold text-linen truncate max-w-[200px]">
                        {sessionData?.mission?.url.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 right-8 flex gap-4 z-10">
                  <div className="p-4 bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]">
                    <p className="text-[10px] font-black text-slate uppercase tracking-widest mb-1">
                      Friction
                    </p>
                    <p
                      className={`text-2xl font-black ${frictionScore > 50 ? "text-orange-400" : "text-emerald-400"}`}
                    >
                      {frictionScore}
                    </p>
                  </div>
                  <div className="p-4 bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[100px]">
                    <p className="text-[10px] font-black text-slate uppercase tracking-widest mb-1">
                      Emotion
                    </p>
                    <p className="text-lg font-black text-lavender uppercase italic">
                      {emotion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 h-24">
                <div className="bg-linen rounded-3xl border border-midnight/5 p-4 flex items-center gap-4">
                  <div className="p-3 bg-midnight text-linen rounded-2xl">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Agent Reasoning
                    </p>
                    <p className="text-sm font-bold text-midnight truncate">
                      Identifying login modal interaction points...
                    </p>
                  </div>
                </div>
                <div className="bg-lavender/10 rounded-3xl border border-lavender/10 p-4 flex items-center gap-4">
                  <div className="p-3 bg-lavender text-linen rounded-2xl">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-lavender uppercase tracking-widest">
                      Security Status
                    </p>
                    <p className="text-sm font-bold text-midnight">
                      Encrypted Channel • Tier 1 Verified
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Diagnostics */}
            <div className="col-span-1 flex flex-col gap-6">
              <Card className="flex-1 rounded-[40px] border-border bg-card shadow-lg flex flex-col overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-linen flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-midnight flex items-center gap-2">
                    <Terminal size={14} className="text-lavender" />
                    Mission Logs
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-linen text-midnight border-none"
                  >
                    LIVE
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 p-4 relative">
                  <div className="absolute inset-0 overflow-y-auto p-6 space-y-4">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-40">
                        <Activity size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          Awaiting telemetry...
                        </p>
                      </div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${log.source === "AI"
                                ? "bg-lavender/10 text-lavender"
                                : log.source === "SYSTEM"
                                  ? "bg-midnight/10 text-midnight"
                                  : "bg-emerald-100 text-emerald-600"
                                }`}
                            >
                              {log.source}
                            </span>
                            <span className="text-[8px] font-mono text-slate font-bold">
                              {log.time}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-midnight leading-relaxed">
                            {log.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
