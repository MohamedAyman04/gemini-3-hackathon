"use client";

import { useState } from "react";
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
import { createMission, createSession } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [missionName, setMissionName] = useState("");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        {/* New Mission Form */}
        <div className="lg:col-span-2">
          <Card className="h-full border-white/5 bg-slate-900/40">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <Play className="w-5 h-5" />
                </div>
                New Testing Mission
              </CardTitle>
              <CardDescription>
                Configure the target and objective for the autonomous agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Mission Name
                </label>
                <Input
                  placeholder="e.g. Guest Checkout Flow"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  icon={<FileText className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Target Application URL
                </label>
                <Input
                  placeholder="https://staging.myapp.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  icon={<Globe className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Testing Context & Objectives
                </label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
                  placeholder="Describe what the user should achieve and any specific scenarios to test..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end pt-4 pb-6">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleLaunch}
                isLoading={isLoading}
                disabled={!url || !context || !missionName}
              >
                Initialize Agent
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
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
                  <span className="text-white">4/10 Sessions</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div className="h-full w-[40%] rounded-full bg-violet-500" />
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
                {[
                  {
                    name: "Login Flow V2",
                    time: "2h ago",
                    status: "completed",
                    issues: 2,
                  },
                  {
                    name: "Dashboard Perf",
                    time: "5h ago",
                    status: "failed",
                    issues: 0,
                  },
                  {
                    name: "Onboarding",
                    time: "1d ago",
                    status: "completed",
                    issues: 5,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-violet-500"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">{item.time}</p>
                      </div>
                    </div>
                    <Badge variant={item.issues > 0 ? "warning" : "secondary"}>
                      {item.issues} Issues
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View All History
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
