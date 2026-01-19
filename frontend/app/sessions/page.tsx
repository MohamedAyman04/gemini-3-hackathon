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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getMissions } from "@/lib/api";

export default function SessionsHistory() {
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredMissions = missions.filter((mission) => {
    if (statusFilter === "all") return true;
    // For now, all missions are "completed" - extend this when you have real status
    return statusFilter === "completed";
  });

  const handleExportCSV = () => {
    if (filteredMissions.length === 0) {
      alert("No missions to export.");
      return;
    }

    const headers = ["ID", "Name", "URL", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredMissions.map((m) =>
        [m.id, `"${m.name}"`, `"${m.url}"`, m.createdAt].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vibecheck-missions-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleActionClick = (action: string) => {
    alert(
      `${action} is coming soon! This will be part of the full repository integration.`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Session History
          </h1>
          <p className="text-gray-400">
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
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <label className="text-sm text-gray-400">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
              </select>
              <span className="text-sm text-gray-500">
                {filteredMissions.length} result
                {filteredMissions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-0">
          <div className="w-full text-left text-sm">
            <div className="flex items-center border-b border-white/5 bg-white/[0.02] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <div className="flex-1">Mission Name</div>
              <div className="w-32">Status</div>
              <div className="w-40">Target URL</div>
              <div className="w-24 text-center">Issues</div>
              <div className="w-40 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading sessions...
                </div>
              ) : filteredMissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No sessions found.
                </div>
              ) : (
                filteredMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="flex items-center px-6 py-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{mission.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-violet-500/50"></span>
                        VibeCheck-01
                      </p>
                    </div>

                    <div className="w-32">
                      <Badge variant="success">completed</Badge>
                    </div>

                    <div className="w-40 text-gray-400 text-xs truncate pr-4">
                      {mission.url}
                    </div>

                    <div className="w-24 text-center">
                      <Badge variant="warning">0</Badge>
                    </div>

                    <div className="w-40 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="View Recording"
                        onClick={() => handleActionClick("Recording playback")}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="View Report"
                        onClick={() =>
                          handleActionClick("Report visualization")
                        }
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Download Artifacts"
                        onClick={() => handleActionClick("Artifact download")}
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
  );
}
