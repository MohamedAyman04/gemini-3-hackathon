"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Maximize2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pause,
  Square,
  AlertTriangle,
  MessageSquare,
  Terminal,
} from "lucide-react";

export default function LiveSession({
  params,
}: {
  params: { sessionId: string };
}) {
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Connection established.",
    "[AGENT] Analyzing DOM structure...",
    "[AGENT] Happy path identified.",
    "[USER] Session started.",
  ]);

  const [emotion, setEmotion] = useState<"Neutral" | "Frustrated" | "Confused">(
    "Neutral"
  );

  const handleTriggerAI = async () => {
    try {
      const response = await fetch("http://localhost:5000/analysis/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://demo.vibecheck.ai/checkout",
          context: "Guest checkout flow with credit card",
          transcript:
            "I am trying to enter my card details but the input field is not letting me type!",
        }),
      });
      const data = await response.json();
      console.log("AI Generated Script:", data.script);
      alert(
        "AI Reasoning Complete! Check console for the generated Playwright script."
      );
    } catch (error) {
      console.error("AI Test failed:", error);
    }
  };

  useEffect(() => {
    // Simulate live logs
    const interval = setInterval(() => {
      const msgs = [
        "[USER] Clicked 'Checkout' button.",
        "[SYSTEM] Navigation to /checkout.",
        "[AGENT] Variable interaction detected.",
        "[USER] Scrolling down...",
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      setLogs((prev) =>
        [...prev, `${new Date().toLocaleTimeString()} ${randomMsg}`].slice(-10)
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Live Session: Guest Checkout Flow
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Session ID: #{params.sessionId} • 00:04:23 elapsed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerAI}
            variant="outline"
            size="sm"
            className="border-violet-500 text-violet-500 hover:bg-violet-500/10"
          >
            Trigger AI Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
          >
            <Square className="w-4 h-4 mr-2 text-red-500" /> End Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Main Screen Stream */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative flex-1 rounded-2xl bg-black border border-white/10 overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
              <p className="text-gray-500 flex items-center gap-2">
                <VideoOff className="w-5 h-5" />
                Waiting for screen stream...
              </p>
            </div>

            {/* Webcam overlay */}
            <div className="absolute top-4 right-4 w-48 h-32 bg-slate-800 rounded-lg border border-white/10 shadow-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs text-center text-gray-500">
                  <p>User Webcam</p>
                  <div className="mt-2 h-1.5 w-16 bg-slate-700 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[60%] animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-black/50 hover:bg-black/70"
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-black/50 hover:bg-black/70"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="bg-black/50 hover:bg-black/70"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
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
                    className={`h-3 w-3 rounded-full ${
                      emotion === "Neutral" ? "bg-blue-500" : "bg-orange-500"
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
                <div className="mt-1 text-lg font-mono">
                  12<span className="text-sm text-gray-500">/100</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="primary"
                className="bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border-violet-500/20 border"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Log Insight
              </Button>
              <Button size="sm" variant="danger">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Intervene
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar: Logs & Events */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="flex-1 border-white/5 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                Live Agent Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="text-gray-300 border-l-2 border-white/10 pl-2 py-0.5"
                  >
                    <span className="opacity-50 block mb-0.5">
                      {log.substring(0, 11)}
                    </span>
                    <span
                      className={
                        log.includes("[AGENT]")
                          ? "text-violet-300"
                          : log.includes("[USER]")
                          ? "text-emerald-300"
                          : "text-gray-100"
                      }
                    >
                      {log.substring(11)}
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
