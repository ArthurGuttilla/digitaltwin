import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, MessageSquare, Database, Twitter, Youtube, Instagram, FileText, LogOut, Bot } from "lucide-react";
import { auth, signOut } from "@/auth";
import { getUserCreators } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreatorProfile } from "@/lib/store";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter:   <Twitter className="w-3.5 h-3.5 text-sky-400" />,
  youtube:   <Youtube className="w-3.5 h-3.5 text-red-400" />,
  instagram: <Instagram className="w-3.5 h-3.5 text-pink-400" />,
  manual:    <FileText className="w-3.5 h-3.5 text-violet-400" />,
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const creators: CreatorProfile[] = await getUserCreators(session.user.id);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-6 h-6 text-violet-400" />
            DigitalTwin
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
              {session.user.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-white/60 hidden sm:block">{session.user.name}</span>

            <Link href="/connect">
              <Button size="sm">
                <Plus className="w-4 h-4" /> New twin
              </Button>
            </Link>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Your digital twins</h1>
        <p className="text-white/40 mb-10">Manage and chat with the AI clones of your online presence</p>

        {creators.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Bot className="w-16 h-16 text-white/10 mx-auto" />
            <p className="text-white/40">No twins yet</p>
            <Link href="/connect">
              <Button>Create your first twin</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {creators.map((c) => (
              <Card key={c.handle} className="hover:border-violet-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center font-bold text-white shrink-0">
                      {c.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">{c.displayName}</CardTitle>
                      <p className="text-xs text-white/40">@{c.handle}</p>
                    </div>
                    <Badge variant={c.totalChunks > 0 ? "success" : "secondary"}>
                      {c.totalChunks > 0 ? "Ready" : "Empty"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center">
                      <p className="text-lg font-bold">{c.totalChunks}</p>
                      <p className="text-xs text-white/40">docs synced</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center">
                      <p className="text-lg font-bold">{c.connectedPlatforms.length}</p>
                      <p className="text-xs text-white/40">platforms</p>
                    </div>
                  </div>

                  {c.connectedPlatforms.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {c.connectedPlatforms.map((p) => (
                        <span
                          key={p}
                          className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"
                        >
                          {PLATFORM_ICONS[p]}
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <Database className="w-3 h-3" />
                    <span className="font-mono truncate">{c.boxId?.slice(0, 24)}…</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link href={`/twin/${c.handle}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </Link>
                    <Link href={`/connect?handle=${c.handle}`}>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
