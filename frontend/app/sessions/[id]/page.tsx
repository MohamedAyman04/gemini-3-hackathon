"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, Clock, FileText, Globe } from "lucide-react";

export default function SessionDetails() {
    const params = useParams();
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                if (params.id) {
                    const data = await getSession(params.id as string);
                    setSession(data);
                }
            } catch (error) {
                console.error("Failed to fetch session:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSession();
    }, [params.id]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading session details...</div>;
    }

    if (!session) {
        return <div className="p-8 text-center text-gray-500">Session not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{session.mission?.name || "Session Details"}</h1>
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
                                    <p className="whitespace-pre-wrap">{session.analysis.summary}</p>
                                ) : (
                                    <p className="text-gray-500 italic">No summary available yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transcript / Logs */}
                    <Card className="border-white/5 bg-slate-900/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Session Logs / Transcript
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-gray-300 h-64 overflow-y-auto">
                                {session.logs ? (
                                    <pre>{JSON.stringify(session.logs.slice(0, 20), null, 2)}</pre>
                                ) : "No logs available."}
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
                                    <span className="font-mono text-xs">{session.id.slice(0, 8)}...</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Mission ID</span>
                                    <span className="font-mono text-xs">{session.missionId.slice(0, 8)}...</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
