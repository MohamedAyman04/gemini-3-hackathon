"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, UserPlus, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Link from "next/link";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const user = await response.json();
        // Notify the extension
        window.postMessage({ type: "VIBECHECK_AUTH_SUCCESS", user }, "*");
        router.push("/");
      } else {
        const error = await response.json();
        alert(error.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("An error occurred during signup");
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
          <div className="flex items-center">
            <p className="text-3xl font-black tracking-tight text-foreground mb-3">
              Join
            </p>
            <div className="flex items-center relative right-4">
              <Image
                src="/vibecheck2.svg"
                alt="VibeCheck"
                width={48}
                height={48}
                style={{ position: "relative", left: "14px", bottom: "7px" }}
              />
              <span className="text-2xl font-black tracking-tight text-foreground mb-3">
                ibeCheck
              </span>
            </div>
          </div>
          <p className="text-muted-foreground max-w-[320px]">
            Start your journey with autonomous AI QA agents today.
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-midnight">
              Create Account
            </CardTitle>
            <CardDescription>
              Fill in your details to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  icon={<User className="w-4 h-4" />}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
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
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  icon={<Lock className="w-4 h-4" />}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  icon={<Lock className="w-4 h-4" />}
                  required
                  className="bg-background border-border"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-8 flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-12 text-lg font-bold bg-primary hover:bg-lp-600 shadow-xl shadow-primary/20 rounded-xl"
                isLoading={isLoading}
              >
                {!isLoading && <UserPlus className="mr-2 w-5 h-5" />}
                Create Account
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground font-medium">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-lp-400 transition-colors font-bold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
