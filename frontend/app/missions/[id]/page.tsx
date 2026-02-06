"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMission, getMe } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Activity, Clock, Globe, ArrowRight, CheckCircle2, Play, Terminal } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function MissionDetails() {
    const params = useParams();
    const router = useRouter();
    const [mission, setMission] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                await getMe();
                if (params.id) {
                    const data = await getMission(params.id as string);
                    setMission(data);
                }
            } catch (error) {
                console.error("Failed to load mission", error);
                router.push("/login"); // Or handle error better
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [params.id, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                    <Activity className="w-8 h-8" />
                    <p>Loading Mission Data...</p>
                </div>
            </div>
        );
    }

    if (!mission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Mission not found.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <Link href="/" className="hover:text-midnight transition-colors">
                                Missions
                            </Link>
                            <span>/</span>
                            <span className="text-midnight font-bold">{mission.name}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-midnight mb-2">{mission.name}</h1>
                                <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        {mission.url}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Created {new Date(mission.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <Button onClick={() => router.push(`/live/${mission.sessions?.[0]?.id}`)} disabled={!mission.sessions?.length} className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white border-none">
                                <Play className="w-4 h-4 mr-2" /> Resume Latest
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Main Info */}
                        <div className="md:col-span-2 space-y-8">
                            <Card className="bg-white border-border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-midnight">Context & Instructions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm max-w-none text-slate-600">
                                        <ReactMarkdown>{mission.context || "No context provided."}</ReactMarkdown>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sessions List */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-midnight flex items-center gap-2">
                                    <div className="p-2 bg-lavender/10 rounded-lg text-lavender">
                                        <Terminal className="w-5 h-5" />
                                    </div>
                                    Session History
                                </h2>

                                {mission.sessions && mission.sessions.length > 0 ? (
                                    mission.sessions.map((session: any) => (
                                        <Card
                                            key={session.id}
                                            className="bg-white border-border hover:border-primary hover:shadow-md transition-all cursor-pointer group shadow-sm"
                                            onClick={() => router.push(`/sessions/${session.id}`)}
                                        >
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {session.id.slice(0, 8)}...
                                                        </span>
                                                        <Badge variant={session.status === 'COMPLETED' ? 'secondary' : 'default'} className="text-[10px]">
                                                            {session.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-bold text-midnight">
                                                        {new Date(session.createdAt).toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {/* Mini stats if available */}
                                                    {session.issues?.length > 0 && (
                                                        <Badge variant="destructive" className="items-center gap-1">
                                                            {session.issues.length} Issues
                                                        </Badge>
                                                    )}
                                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50">
                                        No sessions recorded for this mission yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-6">
                            <Card className="bg-midnight text-linen border-none shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        Mission Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">
                                            {mission.sessions?.length || 0}
                                        </div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sessions</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">
                                            {mission.sessions?.filter((s: any) => s.status === 'COMPLETED').length || 0}
                                        </div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed Runs</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
