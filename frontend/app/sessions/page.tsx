"use client";

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

const sessions = [
  {
    id: 1,
    name: "Guest Checkout Flow",
    date: "Oct 24, 2025",
    duration: "12m 30s",
    status: "completed",
    issues: 2,
    agent: "VibeCheck-01",
  },
  {
    id: 2,
    name: "Login Authentication",
    date: "Oct 23, 2025",
    duration: "08m 45s",
    status: "completed",
    issues: 0,
    agent: "VibeCheck-01",
  },
  {
    id: 3,
    name: "Profile Settings Update",
    date: "Oct 22, 2025",
    duration: "04m 12s",
    status: "aborted",
    issues: 0,
    agent: "VibeCheck-02",
  },
  {
    id: 4,
    name: "Subscription Upgrade",
    date: "Oct 20, 2025",
    duration: "15m 00s",
    status: "completed",
    issues: 5,
    agent: "VibeCheck-01",
  },
  {
    id: 5,
    name: "Mobile Responsiveness",
    date: "Oct 19, 2025",
    duration: "22m 10s",
    status: "completed",
    issues: 8,
    agent: "VibeCheck-03",
  },
];

export default function SessionsHistory() {
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
          <Button variant="outline" size="md">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button variant="primary" size="md">
            Export All CSV
          </Button>
        </div>
      </div>

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-0">
          <div className="w-full text-left text-sm">
            <div className="flex items-center border-b border-white/5 bg-white/[0.02] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <div className="flex-1">Mission Name</div>
              <div className="w-32">Status</div>
              <div className="w-40">Date & Duration</div>
              <div className="w-24 text-center">Issues</div>
              <div className="w-40 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center px-6 py-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{session.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-violet-500/50"></span>
                      {session.agent}
                    </p>
                  </div>

                  <div className="w-32">
                    <Badge
                      variant={
                        session.status === "completed"
                          ? "success"
                          : session.status === "aborted"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>

                  <div className="w-40 text-gray-400 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> {session.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {session.duration}
                    </div>
                  </div>

                  <div className="w-24 text-center">
                    {session.issues > 0 ? (
                      <Badge variant="warning">{session.issues}</Badge>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </div>

                  <div className="w-40 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View Recording"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View Report"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Download Artifacts"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
