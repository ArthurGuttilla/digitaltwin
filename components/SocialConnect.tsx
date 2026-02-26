"use client";

import { useState } from "react";
import {
  Twitter,
  Youtube,
  Instagram,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Platform = "twitter" | "youtube" | "instagram" | "manual";

interface PlatformConfig {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  color: string;
  profileUrl: (h: string) => string;
  hint: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    icon: <Twitter className="w-5 h-5" />,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30",
    profileUrl: (h) => `x.com/${h}`,
    hint: "We'll scrape your public X profile and recent posts via Firecrawl",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <Youtube className="w-5 h-5" />,
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    profileUrl: (h) => `youtube.com/@${h}`,
    hint: "We'll scrape your public YouTube channel page via Firecrawl",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram className="w-5 h-5" />,
    color: "from-pink-500/20 to-purple-600/10 border-pink-500/30",
    profileUrl: (h) => `instagram.com/${h}`,
    hint: "We'll scrape your public Instagram profile via Firecrawl",
  },
  {
    id: "manual",
    label: "Paste content",
    icon: <FileText className="w-5 h-5" />,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    profileUrl: () => "",
    hint: "Paste any content in your own voice — posts, newsletters, scripts, threads",
  },
];

interface SocialConnectProps {
  handle: string;
  connectedPlatforms: Platform[];
  onIngested: (platform: Platform, count: number) => void;
}

export function SocialConnect({ handle, connectedPlatforms, onIngested }: SocialConnectProps) {
  // Platform handle inputs — pre-filled with the creator's main handle
  const [platformHandles, setPlatformHandles] = useState<Record<Platform, string>>({
    twitter: handle,
    youtube: handle,
    instagram: handle,
    manual: "",
  });

  const [loading, setLoading] = useState<Platform | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  async function handleIngest(platform: Platform) {
    setLoading(platform);
    setErrors((e) => ({ ...e, [platform]: "" }));

    const body: Record<string, string> = { handle, platform };

    if (platform === "manual") {
      if (!platformHandles.manual.trim()) {
        setErrors((e) => ({ ...e, manual: "Please paste some content first" }));
        setLoading(null);
        return;
      }
      body.content = platformHandles.manual;
    } else {
      if (!platformHandles[platform].trim()) {
        setErrors((e) => ({ ...e, [platform]: "Enter your handle on this platform" }));
        setLoading(null);
        return;
      }
      body.platformHandle = platformHandles[platform].replace(/^@/, "");
    }

    try {
      const res = await fetch("/api/context/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccesses((s) => ({ ...s, [platform]: true }));
      onIngested(platform, 1);
    } catch (err: any) {
      setErrors((e) => ({ ...e, [platform]: err.message }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PLATFORMS.map((p) => {
        const isConnected = connectedPlatforms.includes(p.id);
        const isLoading = loading === p.id;
        const error = errors[p.id];
        const success = successes[p.id];
        const currentHandle = platformHandles[p.id];
        const previewUrl = p.id !== "manual" ? p.profileUrl(currentHandle.replace(/^@/, "")) : null;

        return (
          <Card key={p.id} className={cn("bg-gradient-to-br", p.color)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {p.icon}
                {p.label}
                {isConnected && (
                  <Badge variant="success" className="ml-auto">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Synced
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{p.hint}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {p.id === "manual" ? (
                <Textarea
                  rows={4}
                  placeholder="Paste your posts, captions, newsletters, scripts…"
                  value={platformHandles.manual}
                  onChange={(e) =>
                    setPlatformHandles((prev) => ({ ...prev, manual: e.target.value }))
                  }
                />
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder={`your ${p.label} handle`}
                    value={currentHandle}
                    onChange={(e) =>
                      setPlatformHandles((prev) => ({
                        ...prev,
                        [p.id]: e.target.value.replace(/^@/, ""),
                      }))
                    }
                  />
                  {previewUrl && currentHandle && (
                    <p className="flex items-center gap-1 text-xs text-white/30">
                      <Globe className="w-3 h-3" />
                      {previewUrl}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
              {success && !error && (
                <p className="text-xs text-emerald-400">
                  ✓ Profile scraped and uploaded to Tropicalia
                </p>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleIngest(p.id)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {p.id === "manual" ? "Uploading…" : "Scraping & uploading…"}
                  </>
                ) : isConnected ? (
                  "Re-sync"
                ) : (
                  "Connect & sync"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
