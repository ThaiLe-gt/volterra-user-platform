"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../providers/AuthProvider";
import { webEnergyClient } from "@/features/data/webEnergyClient";
import type { AuthResponseDto } from "@/features/data/types/webEnergy";

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mock mode: accept any input and start a local session.
    if (DATA_SOURCE === "mock") {
      login("mock-token", {
        id: "user-1",
        name: username || "Operator",
        email: `${username || "operator"}@volterra.io`,
      });
      router.replace("/portfolio");
      return;
    }

    // web-energy: authenticate against the real backend via the proxy.
    setLoading(true);
    try {
      const res = await webEnergyClient.post<AuthResponseDto>("/auth/login", {
        username,
        password,
      });
      const data = res.data;
      if (!data?.accessToken) throw new Error("Invalid response from server");
      login(data.accessToken, {
        id: String(data.userData?.userId ?? ""),
        name: data.userData?.fullName || data.userData?.userName || username,
        email: data.userData?.email,
      });
      router.replace("/portfolio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 w-full max-w-sm space-y-6 rounded-xl border border-white/15 bg-card/82 p-8 shadow-2xl shadow-black/35 backdrop-blur-md"
    >
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Volterra"
            width={44}
            height={34}
            priority
            className="h-9 w-auto object-contain"
          />
          <span className="text-xl font-semibold leading-none">Volterra</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Sign in to Volterra
          </h1>
          <p className="max-w-xs text-sm leading-5 text-muted-foreground">
            Monitor buildings, assets, and live operations in one workspace
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-medium text-foreground">
            Work email
          </span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="name@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="h-11 border-white/10 bg-white/8 pl-10 text-foreground placeholder:text-muted-foreground dark:bg-white/8"
            />
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-foreground">Password</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-white/10 bg-white/8 px-10 text-foreground placeholder:text-muted-foreground dark:bg-white/8"
            />
            <EyeOff className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-4 text-xs">
        <label className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <span className="flex size-4 shrink-0 items-center justify-center rounded bg-teal-500 text-slate-950">
            <Check className="size-3" />
          </span>
          <input type="checkbox" defaultChecked className="sr-only" />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          className="shrink-0 text-teal-400 transition-colors hover:text-teal-300"
        >
          Forgot password?
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
