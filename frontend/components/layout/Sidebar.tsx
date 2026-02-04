"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Settings,
  PlayCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import Image from "next/image";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Sessions", href: "/sessions", icon: History },
  { name: "Live View", href: "/live", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  const emailPrefix = user?.email?.split("@")[0] || "User";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-midnight/10 bg-sidebar text-sidebar-foreground shadow-2xl">
      <div className="flex h-20 items-center bg-sidebar px-6 border-b border-linen/5 mb-2">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image src="/vibecheck.svg" alt="VibeCheck" width={32} height={32} />
          <span className="text-xl font-black tracking-tight text-linen">
            VibeCheck
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-black/20"
                    : "text-slate hover:bg-linen/5 hover:text-linen",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-slate group-hover:text-linen",
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-linen/5 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-linen/5 p-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-lavender to-periwinkle flex items-center justify-center text-linen font-black text-sm border-2 border-linen/10">
            {emailPrefix[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-linen capitalize">
              {emailPrefix}
            </p>
            <p className="truncate text-[10px] text-slate font-medium uppercase tracking-widest opacity-60">
              Pro Account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
