"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogIn, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Logic for signing in
      // For the hackathon, we'll call the backend /auth/login
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Successful login
        // The backend should set a cookie
        router.push("/");
      } else {
        alert("Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 rounded-2xl bg-violet-600/20 text-violet-500 mb-4">
            <Activity className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            VibeCheck
          </h1>
          <p className="text-gray-400">
            Sign in to your dashboard to manage sessions
          </p>
        </div>

        <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-4 pb-6">
              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                isLoading={isLoading}
              >
                <LogIn className="mr-2 w-4 h-4" />
                Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-violet-400 hover:text-violet-300 cursor-pointer font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
