"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Globe,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createMission, createSession, getMissions, getMe } from "@/lib/api";
import Image from "next/image";

export default function Dashboard() {
  const router = useRouter();
  const [missionName, setMissionName] = useState("");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await getMe();
        // If we get here, user is auth
        setIsAuthLoading(false);

        // Now fetch missions
        const data = await getMissions();
        setMissions(data);
      } catch (error) {
        console.warn("Auth check failed, redirecting to login");
        router.push("/login");
      }
    };
    init();
  }, [router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-primary/10 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/vibecheck2.svg"
                alt="VibeCheck"
                width={48}
                height={48}
                className="animate-pulse"
              />
            </div>
          </div>
          <p className="text-midnight font-black uppercase tracking-[0.2em] text-xs animate-pulse">
            Initializing VibeCheck
          </p>
        </div>
      </div>
    );
  }

  const handleLaunch = async () => {
    setIsLoading(true);
    try {
      const mission = await createMission({
        name: missionName,
        url,
        context,
      });

      const session = await createSession(mission.id);

      router.push(`/live/${session.id}`);
    } catch (error) {
      console.error("Failed to launch mission:", error);
      alert("Failed to launch mission. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Mission Control
        </h1>
        <p className="text-gray-400">
          Initialize new autonomous testing sessions and monitor active agents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-white/5 bg-slate-900/40">
              <CardHeader className="pb-2">
                <CardDescription>Active Agents</CardDescription>
                <CardTitle className="text-4xl">12</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 -rotate-45" />
                  <span>+2 from last hour</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-slate-900/40">
              <CardHeader className="pb-2">
                <CardDescription>Hurdles Detected</CardDescription>
                <CardTitle className="text-4xl">4</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-violet-400 flex items-center gap-1">
                  <span>Running AI Analysis</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/5 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                Live Mission Feed
              </CardTitle>
              <CardDescription>
                Real-time activity from autonomous agents started via browser
                extension.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-1">
                {missions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">
                    No active missions. Start one from the browser extension.
                  </div>
                ) : (
                  missions.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-violet-500"
                      onClick={() => router.push(`/live/${item.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">{item.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">Status</p>
                          <p className="text-xs text-emerald-400 font-medium">
                            Monitoring
                          </p>
                        </div>
                        <Badge variant="secondary">View Live</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats / Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-200">
                    System Operational
                  </span>
                </div>
                <Badge variant="success">Online</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Daily Quota</span>
                  <span className="text-white">
                    {missions.length}/10 Sessions
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{
                      width: `${Math.min((missions.length / 10) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg">Recent Missions</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-2">
              <div className="space-y-1">
                {missions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">
                    No missions found. Create your first mission to get started.
                  </div>
                ) : (
                  missions.slice(0, 5).map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-violet-500"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">{item.url}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => router.push("/sessions")}
              >
                View All History
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
