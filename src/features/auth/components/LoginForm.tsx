"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8 shadow-lg"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Volterra</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to the digital-twin platform
        </p>
      </div>
      <Input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
