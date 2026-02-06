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
  Shield,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/layout/Sidebar";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMissions, getMe } from "@/lib/api";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await getMe();
        setIsAuthenticated(true);
        const data = await getMissions();
        setMissions(data);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    init();
  }, []);

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

  if (!isAuthenticated) {
    return <LandingPage router={router} />;
  }

  return <Dashboard missions={missions} router={router} />;
}

function LandingPage({ router }: { router: any }) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto relative z-20">
        <div className="flex items-center gap-3">
          <Image
            src="/vibecheck2.svg"
            alt="VibeCheck"
            width={40}
            height={40}
            style={{ position: "relative", left: "23px", bottom: "1px" }}
          />
          <span className="text-2xl font-black tracking-tight text-midnight">
            ibeCheck
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/login")}
            className="font-bold text-midnight"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/signup")}
            className="font-bold shadow-lg shadow-primary/20"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 flex flex-col items-center px-6">
        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase animate-in fade-in slide-in-from-top-4 duration-1000">
            <Zap className="w-3 h-3 fill-current" />
            VibeCheck Alpha 1.0
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight text-midnight">
            Autonomous <span className="text-primary">QA</span> for Modern Teams
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Automate your end-to-end testing with AI agents that understand your
            application's "vibe" as much as its code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-bold bg-primary hover:opacity-90 shadow-2xl shadow-primary/20"
              onClick={() => router.push("/signup")}
            >
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: <Shield className="w-8 h-8" />,
              title: "Secure by Design",
              desc: "Enterprise-grade encryption for all your sensitive tokens and session data.",
            },
            {
              icon: <Target className="w-8 h-8" />,
              title: "Precision Testing",
              desc: "Define missions with context and let our AI handle the complex edge cases.",
            },
            {
              icon: <Activity className="w-8 h-8" />,
              title: "Live Synthesis",
              desc: "Watch AI agents work in real-time with live logs and instant feedback.",
            },
          ].map((f, i) => (
            <Card
              key={i}
              className="bg-card/50 border-border backdrop-blur-sm hover:border-primary/50 transition-all group overflow-hidden"
            >
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 text-primary group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <CardTitle className="text-midnight">{f.title}</CardTitle>
                <CardDescription className="text-base">
                  {f.desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Image
              src="/vibecheck2.svg"
              alt="VibeCheck"
              width={40}
              height={40}
              style={{ position: "relative", left: "19px", bottom: "1px" }}
            />
            <span className="text-xl font-bold tracking-tight">ibeCheck</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 VibeCheck AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              target="_blank"
              href="https://github.com/MohamedAyman04/gemini-3-hackathon"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ missions, router }: { missions: any[]; router: any }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Mission Control
              </h1>
              <p className="text-muted-foreground">
                Manage your autonomous testing missions.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border bg-card hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardDescription className="font-bold text-muted-foreground">
                  Active Agents
                </CardDescription>
                <CardTitle className="text-4xl text-midnight font-black">
                  {missions.reduce(
                    (acc, m) =>
                      acc +
                      (m.sessions?.filter(
                        (s: any) => s.status === "RUNNING",
                      ).length || 0),
                    0,
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>Live Now</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardDescription className="font-bold text-muted-foreground">
                  Completed Sessions
                </CardDescription>
                <CardTitle className="text-4xl text-midnight font-black">
                  {missions.reduce(
                    (acc, m) =>
                      acc +
                      (m.sessions?.filter(
                        (s: any) => s.status === "COMPLETED",
                      ).length || 0),
                    0,
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-lavender font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Total archived</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-midnight text-xl">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  Your Active Missions
                </CardTitle>
                <CardDescription>
                  Manage and monitor your defined testing missions.
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push("/missions/new")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> New Mission
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-1">
                {missions.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-4">
                    <p>No active missions found.</p>
                    <Button variant="outline" onClick={() => router.push("/missions/new")}>
                      Create your first mission
                    </Button>
                  </div>
                ) : (
                  missions.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer border-l-4 border-transparent hover:border-primary"
                      onClick={() => router.push(`/missions/${item.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <StackIcon />
                            <span>{item.sessions?.length || 0} Sessions</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 10 10-5 10 5-10 5z" />
      <path d="m2 14 10 5 10-5" />
      <path d="m2 18 10 5 10-5" />
    </svg>
  );
}
