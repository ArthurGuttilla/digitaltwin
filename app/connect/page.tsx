"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialConnect } from "@/components/SocialConnect";
import { ContextStats } from "@/components/ContextStats";
import type { CreatorProfile } from "@/lib/store";

type Platform = "twitter" | "youtube" | "instagram" | "manual";

function ConnectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [handle, setHandle] = useState(searchParams.get("handle") ?? "");
  const [displayName, setDisplayName] = useState("");
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState("");

  // If a handle was passed via query string, auto-load it
  useEffect(() => {
    const h = searchParams.get("handle");
    if (h) {
      fetch(`/api/context/status?handle=${h}`)
        .then((r) => r.json())
        .then((data) => { if (data.boxId) setCreator(data); })
        .catch(() => {});
    }
  }, [searchParams]);

  async function initCreator() {
    if (!handle.trim()) return;
    setInitLoading(true);
    setInitError("");
    try {
      const res = await fetch("/api/context/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), displayName: displayName || handle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initialize");
      setCreator(data);
    } catch (err: any) {
      setInitError(err.message);
    } finally {
      setInitLoading(false);
    }
  }

  function handleIngested(platform: Platform, count: number) {
    setCreator((prev) => {
      if (!prev) return prev;
      const platforms = prev.connectedPlatforms.includes(platform)
        ? prev.connectedPlatforms
        : [...prev.connectedPlatforms, platform];
      return {
        ...prev,
        connectedPlatforms: platforms,
        totalChunks: prev.totalChunks + count,
        lastIngested: new Date().toISOString(),
      };
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-6 h-6 text-violet-400" />
            DigitalTwin
          </Link>
          <div className="flex items-center gap-2">
            {creator && creator.totalChunks > 0 && (
              <Button size="sm" onClick={() => router.push(`/twin/${creator.handle}`)}>
                Talk to twin <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <Link href="/dashboard">
              <Button size="sm" variant="outline">Browse twins</Button>
            </Link>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Set up your digital twin</h1>
        <p className="text-white/40 mb-10">
          Enter your handle, connect your platforms, and we'll build your Tropicalia context project.
        </p>

        {/* Step 1 — Identity */}
        {!creator ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4 mb-8">
            <h2 className="font-semibold">
              <span className="text-violet-400 mr-2">1.</span> Your identity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">Handle (your public username) *</label>
                <Input
                  placeholder="yourhandle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                  onKeyDown={(e) => e.key === "Enter" && initCreator()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">Display name</label>
                <Input
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && initCreator()}
                />
              </div>
            </div>
            {initError && <p className="text-xs text-red-400">{initError}</p>}
            <Button onClick={initCreator} disabled={!handle || initLoading}>
              {initLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating project…</>
              ) : (
                "Create context project →"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center font-bold">
              {creator.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{creator.displayName}</p>
              <p className="text-xs text-emerald-400">@{creator.handle} · Tropicalia project ready</p>
            </div>
          </div>
        )}

        {/* Step 2 — Connect platforms */}
        {creator && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-1">
                <span className="text-violet-400 mr-2">2.</span> Connect your socials
              </h2>
              <p className="text-sm text-white/40 mb-4">
                Enter your handle for each platform — we'll scrape your public profile and upload it
                to your Tropicalia project.
              </p>
              <SocialConnect
                handle={creator.handle}
                connectedPlatforms={creator.connectedPlatforms as Platform[]}
                onIngested={handleIngested}
              />
            </div>

            <ContextStats creator={creator} />

            {creator.totalChunks > 0 && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-6 text-center space-y-3">
                <p className="font-medium">
                  Your twin is ready with {creator.totalChunks} document{creator.totalChunks !== 1 ? "s" : ""} synced!
                </p>
                <Button size="lg" onClick={() => router.push(`/twin/${creator.handle}`)}>
                  Talk to @{creator.handle} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <ConnectInner />
    </Suspense>
  );
}
