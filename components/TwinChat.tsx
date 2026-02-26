"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TwinChatProps {
  handle: string;
  displayName: string;
  ready: boolean;
}

export function TwinChat({ handle, displayName, ready }: TwinChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey! I'm the digital twin of @${handle}. Ask me anything or just chat — I'll respond exactly how they would.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, messages: updatedMessages }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `Error: ${err.error}` };
          return next;
        });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: buffer };
          return next;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `Something went wrong: ${err.message}` };
        return next;
      });
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-white/40 gap-3">
        <Bot className="w-12 h-12 opacity-30" />
        <p className="text-sm">Connect social platforms first to power the twin's knowledge</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
          {displayName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-white">@{handle}</p>
          <p className="text-xs text-white/40">Digital Twin · powered by Tropicalia + Claude</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-violet-600"
                  : "bg-gradient-to-br from-violet-500 to-pink-500"
              )}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-tr-sm"
                  : "bg-white/10 text-white/90 rounded-tl-sm"
              )}
            >
              {msg.content || (
                streaming && i === messages.length - 1 ? (
                  <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                ) : null
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message @${handle}…`}
          className="min-h-[40px] max-h-32 resize-none"
          disabled={streaming}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          className="shrink-0"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
