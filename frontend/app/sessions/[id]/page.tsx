"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, getMe } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, Clock, FileText, Globe, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SessionDetails() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-violet-500 animate-pulse" />
          <p className="text-gray-400 animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Clock className="w-8 h-8 animate-spin" />
          <p>Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Activity className="w-12 h-12 text-red-500 opacity-20" />
        <p className="text-gray-500">
          Session not found or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {session.mission?.name || "Session Details"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(session.createdAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              {session.mission?.url}
            </span>
          </div>
        </div>
        <Badge variant={session.status === "COMPLETED" ? "success" : "default"}>
          {session.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Summary */}
          <Card className="border-purple-500/20 bg-purple-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Activity className="w-5 h-5" />
                AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                {session.analysis?.summary ? (
                  <p className="whitespace-pre-wrap">
                    {session.analysis.summary}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    No summary available yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="border-white/5 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Session Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 h-64 overflow-y-auto whitespace-pre-wrap">
                {session.transcript ? (
                  session.transcript
                ) : (
                  <span className="text-gray-500 italic">
                    No transcript available.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card className="border-white/5 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Session Logs (rrweb)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-gray-300 h-48 overflow-y-auto">
                {session.logs && session.logs.length > 0 ? (
                  <pre>
                    {JSON.stringify(session.logs.slice(0, 20), null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-500 italic">
                    No logs captured.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-slate-900/40">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-white">Metadata</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>ID</span>
                  <span className="font-mono text-xs">
                    {session.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mission ID</span>
                  <span className="font-mono text-xs">
                    {session.missionId.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
