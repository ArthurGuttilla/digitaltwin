"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TwinChat } from "@/components/TwinChat";
import { ContextStats } from "@/components/ContextStats";
import type { CreatorProfile } from "@/lib/store";

interface Props {
  params: Promise<{ handle: string }>;
}

export default function TwinPage({ params }: Props) {
  const { handle } = use(params);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/context/status?handle=${handle}`)
      .then((r) => r.json())
      .then((data) => {
        setCreator(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [handle]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-6 h-6 text-violet-400" />
            <span>DigitalTwin</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/connect">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Link href={`/dashboard`}>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-white/40">Loading twin…</div>
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : !creator ? (
          <div className="text-white/40 text-sm">
            Twin not found.{" "}
            <Link href="/connect" className="underline text-violet-400">
              Create one first.
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat — takes up 2/3 */}
            <div className="lg:col-span-2">
              <TwinChat
                handle={creator.handle}
                displayName={creator.displayName}
                ready={creator.totalChunks > 0}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <ContextStats creator={creator} />

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/40 space-y-2">
                <p className="font-medium text-white/70">How this works</p>
                <p>
                  Every message queries your <span className="text-violet-400">Tropicalia</span> context
                  box. The top 8 most relevant chunks from your social content are fed to{" "}
                  <span className="text-violet-400">Claude</span> as your twin's memory.
                </p>
                <p>
                  The more content you ingest, the more accurately the twin reflects your voice.
                </p>
              </div>

              <Link href="/connect">
                <Button variant="outline" className="w-full" size="sm">
                  + Add more content
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
