"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Target,
  Github,
  Trello,
  Calendar,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";

export default function NewMissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    context: "",
    githubToken: "",
    integrationType: "none",
    jiraToken: "",
    trelloToken: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/missions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (response.ok) {
        router.push("/");
      } else {
        alert("Failed to create mission");
      }
    } catch (error) {
      console.error("Error creating mission:", error);
      alert("Error creating mission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>

          <Card className="border-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-midnight">
                    Create New Mission
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define the goals and context for your autonomous testing
                    session.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 text-midnight">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold opacity-70">
                      Mission Name
                    </label>
                    <Input
                      required
                      placeholder="e.g., Test Login Flow"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="bg-background border-border focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold opacity-70">
                      Target URL
                    </label>
                    <Input
                      required
                      type="url"
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                      className="bg-background border-border focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-70">
                    Mission Context
                  </label>
                  <Textarea
                    required
                    placeholder="Describe what the AI should focus on during this session..."
                    value={formData.context}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, context: e.target.value })
                    }
                    className="bg-background border-border focus:ring-primary min-h-[100px]"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-midnight">
                    <Github className="w-5 h-5" />
                    Integration & Tokens
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold opacity-70">
                          GitHub Token (Optional)
                        </label>
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-[10px] flex items-center gap-1 font-bold"
                        >
                          How to generate? <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <Input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={formData.githubToken}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({
                            ...formData,
                            githubToken: e.target.value,
                          })
                        }
                        className="bg-background border-border focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Required for creating issues in GitHub repositories.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold opacity-70">
                        Issue Tracker
                      </label>
                      <div className="flex gap-4">
                        {["none", "jira", "trello"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                integrationType: type as any,
                              })
                            }
                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-bold transition-all ${
                              formData.integrationType === type
                                ? "bg-primary border-primary text-primary-foreground shadow-lg"
                                : "bg-background border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.integrationType === "jira" && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold opacity-70">
                            Jira API Token
                          </label>
                          <a
                            href="https://id.atlassian.com/manage-profile/security/api-tokens"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-[10px] flex items-center gap-1 font-bold"
                          >
                            How to generate?{" "}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <Input
                          required
                          type="password"
                          placeholder="Enter Jira Token"
                          value={formData.jiraToken}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({
                              ...formData,
                              jiraToken: e.target.value,
                            })
                          }
                          className="bg-background border-border focus:ring-primary"
                        />
                      </div>
                    )}

                    {formData.integrationType === "trello" && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold opacity-70">
                            Trello API Key/Token
                          </label>
                          <a
                            href="https://trello.com/app-key"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-[10px] flex items-center gap-1 font-bold"
                          >
                            How to generate?{" "}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <Input
                          required
                          type="password"
                          placeholder="Enter Trello Token"
                          value={formData.trelloToken}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({
                              ...formData,
                              trelloToken: e.target.value,
                            })
                          }
                          className="bg-background border-border focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:opacity-90 text-primary-foreground h-12 text-lg font-bold shadow-xl shadow-primary/20"
                  >
                    {loading ? "Creating..." : "Create Mission"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
