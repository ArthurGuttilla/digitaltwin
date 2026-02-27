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
  Link2,
  ExternalLink,
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
  buildUrl: (handle: string) => string;
  handlePlaceholder: string;
  hint: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    icon: <Twitter className="w-5 h-5" />,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30",
    buildUrl: (h) => `https://x.com/${h}`,
    handlePlaceholder: "e.g. elonmusk",
    hint: "Firecrawl will scrape your public X profile for posts and bio",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <Youtube className="w-5 h-5" />,
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    buildUrl: (h) => `https://www.youtube.com/@${h}`,
    handlePlaceholder: "e.g. mkbhd",
    hint: "Firecrawl will scrape your YouTube channel page",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram className="w-5 h-5" />,
    color: "from-pink-500/20 to-purple-600/10 border-pink-500/30",
    buildUrl: (h) => `https://www.instagram.com/${h}/`,
    handlePlaceholder: "e.g. neymarjr",
    hint: "Firecrawl will scrape your public Instagram profile",
  },
  {
    id: "manual",
    label: "Paste content",
    icon: <FileText className="w-5 h-5" />,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    buildUrl: () => "",
    handlePlaceholder: "",
    hint: "Paste any content in your own voice — posts, newsletters, scripts, threads",
  },
];

interface PlatformState {
  handle: string;
  url: string;        // editable full URL sent to Firecrawl
  urlEdited: boolean; // true if user manually edited the URL
}

interface SocialConnectProps {
  handle: string;
  connectedPlatforms: Platform[];
  onIngested: (platform: Platform, count: number) => void;
}

export function SocialConnect({ handle, connectedPlatforms, onIngested }: SocialConnectProps) {
  // Per-platform state: handle input + editable Firecrawl URL
  const [states, setStates] = useState<Record<Platform, PlatformState>>(() => {
    const initial: Record<string, PlatformState> = {};
    for (const p of PLATFORMS) {
      const h = p.id !== "manual" ? handle.replace(/^@/, "") : "";
      initial[p.id] = {
        handle: h,
        url: p.buildUrl(h),
        urlEdited: false,
      };
    }
    return initial as Record<Platform, PlatformState>;
  });

  const [manualContent, setManualContent] = useState("");
  const [loading, setLoading] = useState<Platform | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  // When handle changes: rebuild URL only if user hasn't manually edited it
  function onHandleChange(platform: Platform, raw: string) {
    const h = raw.replace(/^@/, "");
    setStates((prev) => {
      const p = PLATFORMS.find((x) => x.id === platform)!;
      return {
        ...prev,
        [platform]: {
          handle: h,
          url: prev[platform].urlEdited ? prev[platform].url : p.buildUrl(h),
          urlEdited: prev[platform].urlEdited,
        },
      };
    });
  }

  // When URL is edited directly
  function onUrlChange(platform: Platform, url: string) {
    setStates((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], url, urlEdited: true },
    }));
  }

  async function handleIngest(platform: Platform) {
    setLoading(platform);
    setErrors((e) => ({ ...e, [platform]: "" }));

    try {
      const body: Record<string, string> = { handle, platform };

      if (platform === "manual") {
        if (!manualContent.trim()) {
          setErrors((e) => ({ ...e, manual: "Please paste some content first" }));
          setLoading(null);
          return;
        }
        body.content = manualContent;
      } else {
        const url = states[platform].url.trim();
        if (!url) {
          setErrors((e) => ({ ...e, [platform]: "Enter a URL to scrape" }));
          setLoading(null);
          return;
        }
        body.url = url;
      }

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
        const st = states[p.id];

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

            <CardContent className="space-y-2.5">
              {p.id === "manual" ? (
                <Textarea
                  rows={4}
                  placeholder="Paste your posts, captions, newsletters, scripts…"
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                />
              ) : (
                <>
                  {/* Handle input — auto-rebuilds the URL */}
                  <Input
                    placeholder={p.handlePlaceholder}
                    value={st.handle}
                    onChange={(e) => onHandleChange(p.id, e.target.value)}
                  />

                  {/* Editable URL — the actual link sent to Firecrawl */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> URL to scrape with Firecrawl
                    </p>
                    <div className="flex gap-1.5">
                      <Input
                        value={st.url}
                        onChange={(e) => onUrlChange(p.id, e.target.value)}
                        className="font-mono text-xs text-white/70"
                        placeholder="https://…"
                      />
                      {st.url && (
                        <a
                          href={st.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
              {success && !error && (
                <p className="text-xs text-emerald-400">
                  ✓ Scraped and uploaded to your Tropicalia project
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
