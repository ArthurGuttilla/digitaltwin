"use client";

import { useState } from "react";
import { Twitter, Youtube, Instagram, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
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
  placeholder: string;
  hint: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    icon: <Twitter className="w-5 h-5" />,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30",
    placeholder: "username (without @)",
    hint: "We'll pull your last 100 tweets to learn your writing style",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <Youtube className="w-5 h-5" />,
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    placeholder: "channel name or handle",
    hint: "We'll pull titles + descriptions from your recent videos",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram className="w-5 h-5" />,
    color: "from-pink-500/20 to-purple-600/10 border-pink-500/30",
    placeholder: "Instagram user ID (numeric)",
    hint: "Requires a connected Instagram access token — add it in Settings",
  },
  {
    id: "manual",
    label: "Paste content",
    icon: <FileText className="w-5 h-5" />,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    placeholder: "Paste your posts, captions, newsletters…",
    hint: "Paste any content in your own voice — emails, posts, scripts, threads",
  },
];

interface SocialConnectProps {
  handle: string;
  connectedPlatforms: Platform[];
  onIngested: (platform: Platform, count: number) => void;
}

export function SocialConnect({ handle, connectedPlatforms, onIngested }: SocialConnectProps) {
  const [inputs, setInputs] = useState<Record<Platform, string>>({
    twitter: "",
    youtube: "",
    instagram: "",
    manual: "",
  });
  const [loading, setLoading] = useState<Platform | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, number>>({});

  async function handleIngest(platform: Platform) {
    setLoading(platform);
    setErrors((e) => ({ ...e, [platform]: "" }));

    const body: Record<string, string> = { handle, platform };
    if (platform === "manual") {
      body.content = inputs.manual;
    } else if (platform === "instagram") {
      body.userId = inputs.instagram;
    }

    try {
      const res = await fetch("/api/context/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccesses((s) => ({ ...s, [platform]: data.chunksIngested }));
      onIngested(platform, data.chunksIngested);
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

        return (
          <Card key={p.id} className={cn("bg-gradient-to-br", p.color)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {p.icon}
                {p.label}
                {isConnected && (
                  <Badge variant="success" className="ml-auto">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{p.hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.id === "manual" ? (
                <Textarea
                  rows={4}
                  placeholder={p.placeholder}
                  value={inputs[p.id]}
                  onChange={(e) => setInputs((i) => ({ ...i, [p.id]: e.target.value }))}
                />
              ) : (
                <Input
                  placeholder={p.placeholder}
                  value={inputs[p.id]}
                  onChange={(e) => setInputs((i) => ({ ...i, [p.id]: e.target.value }))}
                />
              )}

              {error && (
                <p className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
              {success !== undefined && (
                <p className="text-xs text-emerald-400">
                  ✓ {success} chunks ingested into Tropicalia
                </p>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleIngest(p.id)}
                disabled={isLoading || (!inputs[p.id] && p.id !== "twitter")}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Ingesting…
                  </>
                ) : isConnected ? (
                  "Re-sync"
                ) : (
                  "Connect & ingest"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
