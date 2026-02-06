"use client";

import ReactMarkdown from "react-markdown";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, getMe } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, Clock, FileText, Globe, Terminal, AlertTriangle, CheckCircle2, Bug, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SessionDetails() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'logs'>('transcript');

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check Auth
        await getMe();
        setIsAuthLoading(false);

        // 2. Fetch Session
        if (params.id) {
          try {
            const data = await getSession(params.id as string);
            setSession(data);
          } catch (e) {
            console.error("Session fetch failed:", e);
          }
        }
      } catch (error) {
        console.warn("Auth check failed, redirecting to login");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [params.id, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Clock className="w-8 h-8 animate-spin" />
          <p className="font-medium">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-background">
        <Activity className="w-12 h-12 text-red-500 opacity-20" />
        <p className="text-muted-foreground font-medium">
          Session not found or you don't have access.
        </p>
        <Link href="/" className="text-primary hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Link href="/" className="hover:text-midnight transition-colors">Missions</Link>
                <span>/</span>
                <Link href={`/missions/${session.missionId}`} className="hover:text-midnight transition-colors">{session.mission?.name || "Mission"}</Link>
                <span>/</span>
                <span className="text-midnight font-bold">Session {session.id.slice(0, 6)}</span>
              </div>
              <h1 className="text-3xl font-black text-midnight flex items-center gap-3">
                {session.mission?.name || "Session Details"}
                <Badge variant={session.status === "COMPLETED" ? "secondary" : "default"} className="text-xs align-middle">
                  {session.status}
                </Badge>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end text-sm">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Clock className="w-4 h-4" />
                  {new Date(session.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                  <Globe className="w-3 h-3" />
                  {session.mission?.url}
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: AI Summary & Issues (Priority) */}
            <div className="lg:col-span-2 space-y-8">

              {/* AI Executive Summary */}
              <Card className="bg-white border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-linear-to-r from-lavender/10 to-transparent border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-midnight text-lg">
                      <div className="p-1.5 bg-lavender text-white rounded-md">
                        <Activity className="w-4 h-4" />
                      </div>
                      AI Executive Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600 font-medium leading-relaxed">
                    {session.analysis?.summary ? (
                      <ReactMarkdown>{session.analysis.summary}</ReactMarkdown>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <Activity className="w-8 h-8 mb-2 opacity-20" />
                        <p className="italic">Analysis in progress...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reported Issues */}
              <Card className="bg-white border-border shadow-sm">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-midnight text-lg">
                    <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    Reported Issues
                    {session.issues?.length > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                        {session.issues.length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {session.issues && session.issues.length > 0 ? (
                      session.issues.map((issue: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className={`mt-1 p-1.5 rounded-full ${issue.type === 'bug' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {issue.type === 'bug' ? <Bug size={14} /> : <AlertTriangle size={14} />}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-midnight capitalize">{issue.type}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                                {new Date(issue.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              {issue.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">No critical issues reported during this session. Clean run!</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column: Technical Details (Tabs) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white border-border shadow-sm flex flex-col h-full max-h-[calc(100vh-12rem)]">
                <CardHeader className="border-b border-border/50 p-2">
                  <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'transcript' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <FileText size={14} /> Transcript
                    </button>
                    <button
                      onClick={() => setActiveTab('logs')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'logs' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Terminal size={14} /> System Logs
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden relative min-h-[500px]">
                  <div className={`absolute inset-0 overflow-y-auto p-4 ${activeTab === 'transcript' ? 'block' : 'hidden'}`}>
                    {session.transcript ? (
                      <div className="space-y-4">
                        {/* Simple parsing of transcript if possible, otherwise pre-wrap */}
                        <div className="font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {session.transcript}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <FileText size={24} className="opacity-20" />
                        <p className="text-xs italic">No transcript recorded</p>
                      </div>
                    )}
                  </div>
                  <div className={`absolute inset-0 overflow-y-auto p-4 bg-slate-50 ${activeTab === 'logs' ? 'block' : 'hidden'}`}>
                    {session.logs && session.logs.length > 0 ? (
                      <pre className="font-mono text-[10px] text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(session.logs.slice(0, 50), null, 2)}
                        {session.logs.length > 50 && `\n\n... ${session.logs.length - 50} more items`}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                        <Terminal size={24} className="opacity-20" />
                        <p className="text-xs italic">No logs captured</p>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Metadata Footer */}
                <div className="p-4 bg-slate-50 border-t border-border/50 text-xs text-slate-500 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="text-slate-700">{session.id}</span>
                  </div>

                </div>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
