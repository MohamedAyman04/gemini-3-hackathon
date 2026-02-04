"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  ArrowRight,
  Play,
  Globe,
  Search,
  Plus,
  Shield,
} from "lucide-react";
import { getMissions } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/Badge";
import Image from "next/image";

export default function LiveViewSelection() {
  const router = useRouter();
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const data = await getMissions();
        setMissions(data);
      } catch (error) {
        console.error("Failed to fetch missions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMissions();
  }, []);

  const activeMissions = missions.filter((m) =>
    m.sessions?.some((s: any) => s.status === "RUNNING"),
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lavender/10 border border-lavender/20 text-lavender text-[10px] font-black uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lavender opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lavender"></span>
                </span>
                Real-time Monitoring
              </div>
              <h1 className="text-5xl font-black tracking-tight text-midnight leading-none">
                Live <span className="text-lavender">Agent</span> Feed
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Observe autonomous QA agents as they navigate and test your
                applications in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-lavender transition-colors" />
                <input
                  type="text"
                  placeholder="Search missions..."
                  className="pl-10 pr-4 py-2 rounded-xl bg-card border border-border focus:ring-2 focus:ring-lavender outline-none text-sm w-64 transition-all"
                />
              </div>
              <Button
                onClick={() => router.push("/missions/new")}
                className="gap-2 shadow-xl shadow-lavender/20"
              >
                <Plus className="w-4 h-4" /> New Mission
              </Button>
            </div>
          </div>

          {/* Activity Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-midnight rounded-3xl p-6 text-linen shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-lavender/10 rounded-full blur-2xl group-hover:bg-lavender/20 transition-colors" />
              <div className="relative z-10 flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                  Live Sessions
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black leading-none">
                    {activeMissions.length}
                  </span>
                  <Badge
                    variant="success"
                    className="mb-1 opacity-80 animate-pulse"
                  >
                    Online
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-periwinkle/10 border border-periwinkle/20 rounded-3xl p-6 text-midnight group hover:bg-periwinkle/20 transition-all cursor-default">
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                  Avg. Response Time
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black leading-none text-periwinkle">
                    1.2s
                  </span>
                  <span className="text-xs font-bold text-muted-foreground mb-1">
                    Optimal
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-linen border border-midnight/5 rounded-3xl p-6 text-midnight group hover:border-lavender/30 transition-all cursor-default overflow-hidden relative">
              <div className="absolute right-0 bottom-0 opacity-[0.03] rotate-12 translate-x-4 translate-y-4">
                <Activity size={160} />
              </div>
              <div className="flex flex-col gap-4 relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                  Hurdles Cleared
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black leading-none">248</span>
                  <span className="text-xs font-bold text-emerald-600 mb-1">
                    +12 today
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Grid */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-midnight flex items-center gap-3">
              <Play className="w-6 h-6 text-lavender fill-current" />
              Currently Active
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-lavender/10 border-t-lavender rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src="/vibecheck.svg"
                      alt="Loading"
                      width={24}
                      height={24}
                      className="animate-pulse"
                    />
                  </div>
                </div>
                <p className="text-muted-foreground font-bold animate-pulse uppercase tracking-widest text-xs">
                  Scanning for agents...
                </p>
              </div>
            ) : activeMissions.length === 0 ? (
              <Card className="border-2 border-dashed border-border bg-card/50 py-24 rounded-[40px]">
                <CardContent className="flex flex-col items-center justify-center text-center space-y-8">
                  <div className="p-8 rounded-full bg-linen relative">
                    <Activity
                      size={64}
                      className="text-slate opacity-40 shrink-0"
                    />
                    <div className="absolute top-0 right-0 w-6 h-6 bg-periwinkle rounded-full border-4 border-card" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-midnight">
                      All Quiet on the Testing Front
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-lg">
                      No agents are currently active. Launch a new mission from
                      your browser extension to see the magic happen.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => router.push("/")}
                    className="rounded-2xl h-14 px-10 text-lg shadow-2xl shadow-lavender/20"
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeMissions.map((mission) => {
                  const runningSession = mission.sessions?.find(
                    (s: any) => s.status === "RUNNING",
                  );
                  return (
                    <div
                      key={mission.id}
                      onClick={() =>
                        runningSession &&
                        router.push(`/live/${runningSession.id}`)
                      }
                      className="group relative bg-card rounded-[32px] border border-border p-1 hover:border-lavender/50 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-lavender/10 hover:-translate-y-2"
                    >
                      <div className="bg-white rounded-[28px] p-6 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="p-3 bg-lavender/10 rounded-2xl text-lavender group-hover:scale-110 transition-transform">
                            <Activity size={24} className="animate-pulse" />
                          </div>
                          <Badge
                            variant="success"
                            className="uppercase tracking-tighter text-[10px] py-0 px-2 font-black"
                          >
                            Live Now
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-midnight truncate uppercase tracking-tight">
                            {mission.name}
                          </h3>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                            <Globe className="w-4 h-4" />
                            <span className="truncate">
                              {mission.url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-linen">
                          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-4">
                            <span>SESSION DURATION</span>
                            <span className="text-midnight font-black tabular-nums">
                              14:22
                            </span>
                          </div>
                          <Button className="w-full h-12 rounded-2xl gap-2 font-bold group-hover:shadow-lg group-hover:shadow-lavender/20 transition-all">
                            Observe Agent{" "}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>

                      {/* Decorative elements */}
                      <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-lavender/5 rounded-full blur-2xl group-hover:bg-lavender/20 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Footnote */}
          <div className="flex items-center justify-center pt-12">
            <p className="text-slate text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              End-to-end encrypted session monitoring enabled
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
