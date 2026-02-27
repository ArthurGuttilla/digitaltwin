import Link from "next/link";
import { Bot, Twitter, Youtube, Instagram, Zap, Database, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // Where CTAs point depends on auth state
  const primaryHref = isLoggedIn ? "/dashboard" : "/signup";
  const createHref  = isLoggedIn ? "/connect"   : "/signup";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-6 h-6 text-violet-400" />
            <span>DigitalTwin</span>
          </div>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
              <Link href="/dashboard">
                <Button size="sm">Dashboard <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="outline">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Hero */}
        <section className="text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-300 mb-8">
            <Zap className="w-3 h-3" />
            Powered by Tropicalia context layer + Claude
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
            Clone the way<br />you communicate
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10">
            Connect your social accounts. We ingest your content into a Tropicalia context box
            and build an AI twin that writes, talks, and thinks exactly like you.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={createHref}>
              <Button size="lg">
                Create your twin <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={isLoggedIn ? "/dashboard" : "/login"}>
              <Button size="lg" variant="outline">
                {isLoggedIn ? "View my twins" : "Sign in"}
              </Button>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold text-center mb-12 text-white/80">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Twitter className="w-6 h-6 text-sky-400" />,
                title: "Connect your socials",
                desc: "Link Twitter/X, YouTube, Instagram or paste your own content — anything you've written in your voice.",
              },
              {
                icon: <Database className="w-6 h-6 text-violet-400" />,
                title: "We store your voice in Tropicalia",
                desc: "Your content is chunked and stored in a private Tropicalia context box — your own AI knowledge base.",
              },
              {
                icon: <MessageSquare className="w-6 h-6 text-pink-400" />,
                title: "Chat with your twin",
                desc: "Claude queries your Tropicalia box on every message, retrieving the most relevant context to respond exactly like you.",
              },
            ].map((step, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="font-medium text-white">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platforms */}
        <section className="max-w-5xl mx-auto px-6 py-8 pb-24">
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div>
              <h3 className="font-semibold text-white mb-1">Supported platforms</h3>
              <p className="text-sm text-white/40">Ingest from anywhere you create</p>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-1.5 text-sky-400">
                <Twitter className="w-7 h-7" />
                <span className="text-xs text-white/40">Twitter</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-red-400">
                <Youtube className="w-7 h-7" />
                <span className="text-xs text-white/40">YouTube</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-pink-400">
                <Instagram className="w-7 h-7" />
                <span className="text-xs text-white/40">Instagram</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-violet-400">
                <Bot className="w-7 h-7" />
                <span className="text-xs text-white/40">Manual</span>
              </div>
            </div>
            <Link href={createHref}>
              <Button>Start now <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
