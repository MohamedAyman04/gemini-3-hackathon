"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogIn, Mail, Lock, ArrowLeft } from "lucide-react";
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
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="flex flex-col items-center text-center">
          <div className="p-4 rounded-3xl mb-6 flex flex-col items-center gap-2">
            <Image
              src="/vibecheck.svg"
              alt="VibeCheck"
              width={48}
              height={48}
            />
            <h1 className="text-4xl font-black tracking-tight text-midnight mb-3">
              Welcome Back
            </h1>
          </div>
          <p className="text-muted-foreground max-w-[280px]">
            Sign in to manage your autonomous testing sessions.
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-midnight">
              Authentication
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the hub.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  icon={<Mail className="w-4 h-4" />}
                  required
                  className="bg-background border-border h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Password
                  </label>
                  <Link
                    href="#"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  icon={<Lock className="w-4 h-4" />}
                  required
                  className="bg-background border-border h-12 rounded-xl"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-8">
              <Button
                type="submit"
                className="w-full h-12 text-lg font-bold bg-primary hover:bg-lp-600 shadow-xl shadow-primary/20 transition-all rounded-xl"
                isLoading={isLoading}
              >
                {!isLoading && <LogIn className="mr-2 w-5 h-5" />}
                Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          New to VibeCheck?{" "}
          <Link
            href="/signup"
            className="text-primary hover:text-lp-400 font-bold transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
