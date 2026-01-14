"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-gray-400">
          Configure global agent behavior and integrations.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="border-white/5 bg-slate-900/40">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Manage connection to the VibeCheck backend and external services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Backend Endpoint
              </label>
              <Input defaultValue="http://localhost:3000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Gemini API Key
              </label>
              <Input
                type="password"
                value="************************"
                disabled
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-slate-900/40">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose how you want to be alerted about mission outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Email and Slack integration coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
