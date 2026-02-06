"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  Clock,
  Video,
  FileText,
  Download,
  Filter,
  ArrowRight,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSessions, getMe } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function SessionsHistory() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await getMe();
        setIsAuthLoading(false);

        const data = await getSessions();
        setSessions(data);
      } catch (error) {
        console.warn("Auth check failed, redirecting to login");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  const filteredSessions = sessions.filter((session) => {
    if (statusFilter === "all") return true;
    return session.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const handleExportCSV = () => {
    if (filteredSessions.length === 0) {
      alert("No sessions to export.");
      return;
    }

    const headers = [
      "ID",
      "Mission Name",
      "Target URL",
      "Status",
      "Created At",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredSessions.map((s) =>
        [
          s.id,
          `"${s.mission?.name || "Unknown"}"`,
          `"${s.mission?.url || ""}"`,
          s.status,
          s.createdAt,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vibecheck-sessions-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadArtifacts = (session: any) => {
    const data = {
      id: session.id,
      mission: session.mission,
      transcript: session.transcript,
      analysis: session.analysis,
      logs: session.logs,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-${session.id}-artifacts.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Session History
              </h1>
              <p className="text-muted-foreground">
                Review past autonomous testing sessions and generated reports.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
              <Button variant="primary" size="md" onClick={handleExportCSV}>
                Export All CSV
              </Button>
            </div>
          </div>

          {showFilters && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <label className="text-sm text-muted-foreground">
                    Status:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="running">Running</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredSessions.length} result
                    {filteredSessions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card shadow-xl">
            <CardContent className="p-0">
              <div className="w-full text-left text-sm">
                <div className="flex items-center border-b border-border bg-white/[0.02] px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex-1">Mission Name</div>
                  <div className="w-32">Status</div>
                  <div className="w-48">Target URL</div>
                  <div className="w-32 text-center">Date</div>
                  <div className="w-40 text-right">Actions</div>
                </div>

                <div className="divide-y divide-border">
                  {isLoading ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                      <Activity className="w-8 h-8 animate-spin text-primary" />
                      <span>Loading history...</span>
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      No sessions found.
                    </div>
                  ) : (
                    filteredSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center px-6 py-5 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex-1">
                          <Link
                            href={`/sessions/${session.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {session.mission?.name || "Unnamed Mission"}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {session.id.slice(0, 8)}
                          </p>
                        </div>

                        <div className="w-32">
                          <Badge
                            variant={
                              session.status === "COMPLETED"
                                ? "success"
                                : session.status === "RUNNING"
                                  ? "warning"
                                  : "outline"
                            }
                          >
                            {session.status.toLowerCase()}
                          </Badge>
                        </div>

                        <div className="w-48 text-muted-foreground text-xs truncate pr-4 flex items-center gap-2">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {session.mission?.url}
                          </span>
                        </div>

                        <div className="w-32 text-center text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>

                        <div className="w-40 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
                            title="View Recording"
                            onClick={() =>
                              router.push(`/sessions/${session.id}#video`)
                            }
                          >
                            <Video className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
                            title="View Report"
                            onClick={() =>
                              router.push(`/sessions/${session.id}`)
                            }
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
                            title="Download Artifacts"
                            onClick={() => handleDownloadArtifacts(session)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
