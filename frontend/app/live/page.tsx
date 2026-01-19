"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Activity, ArrowRight } from "lucide-react";
import { getMissions } from "@/lib/api";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Active Sessions
        </h1>
        <p className="text-gray-400">
          Select a mission to view its live testing agent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            Loading active sessions...
          </div>
        ) : missions.length === 0 ? (
          <Card className="col-span-full border-dashed border-white/10 bg-transparent py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Activity className="h-12 w-12 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                No Active Missions
              </h2>
              <p className="text-gray-500 max-w-sm mb-6">
                Create a mission from the dashboard to start monitoring an
                autonomous testing agent.
              </p>
              <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          missions.map((mission) => (
            <Card
              key={mission.id}
              className="group hover:border-violet-500/50 transition-all cursor-pointer bg-slate-900/40"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{mission.name}</span>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </CardTitle>
                <p className="text-xs text-gray-500 truncate">{mission.url}</p>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-violet-600 group-hover:text-white transition-all"
                  onClick={() => router.push(`/live/${mission.id}`)}
                >
                  Join Live Stream
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
