"use client";

import { Database, Twitter, Youtube, Instagram, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CreatorProfile } from "@/lib/store";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  manual: <FileText className="w-3.5 h-3.5" />,
};

interface ContextStatsProps {
  creator: CreatorProfile;
}

export function ContextStats({ creator }: ContextStatsProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Tropicalia Context Box</p>
            <p className="text-xs text-white/40 font-mono">{creator.boxId ?? "not created yet"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xl font-bold text-white">{creator.totalChunks}</p>
            <p className="text-xs text-white/40">context chunks</p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xl font-bold text-white">{creator.connectedPlatforms.length}</p>
            <p className="text-xs text-white/40">platforms synced</p>
          </div>
        </div>

        {creator.connectedPlatforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {creator.connectedPlatforms.map((p) => (
              <Badge key={p} variant="secondary" className="flex items-center gap-1 capitalize">
                {PLATFORM_ICONS[p]}
                {p}
              </Badge>
            ))}
          </div>
        )}

        {creator.lastIngested && (
          <p className="flex items-center gap-1.5 text-xs text-white/30">
            <RefreshCw className="w-3 h-3" />
            Last synced {new Date(creator.lastIngested).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
