"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, Loader2, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { aiChat } from "@/actions/ai";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "model"; text: string; error?: boolean };

const STORAGE_KEY = "admin-ai-chat";
const SUGGESTIONS = [
  "Write a Facebook post for our angle grinders",
  "Flash sale ideas for this week",
  "Reply politely to a customer asking about delivery time",
  "Which products should I restock first?",
  "Coupon kaise banate hain? Step by step batao",
];

/** Tiny formatter for the assistant's replies: paragraphs, "-"/"1." lists and **bold**. */
function Formatted({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
    );
  const blocks = text
    .replace(/\r/g, "")
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "") // horizontal rules
    .split(/\n{2,}/)
    .filter((b) => b.trim());
  return (
    <div className="space-y-2.5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={bi} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, li) => (
                <li key={li}>{bold(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {bold(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text.replace(/\*\*/g, "")).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the conversation while moving between admin pages (this browser tab only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    const next: Msg[] = [...messages.filter((m) => !m.error), { role: "user", text: t }];
    setMessages(next);
    setInput("");
    start(async () => {
      const res = await aiChat(next.map(({ role, text }) => ({ role, text })));
      setMessages((m) => [...m, "error" in res ? { role: "model", text: res.error, error: true } : { role: "model", text: res.text }]);
    });
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:scale-105 sm:right-6 sm:bottom-6 print:hidden"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-4 w-4" /> Ask AI
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100vh-3rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl print:hidden"
          role="dialog"
          aria-label="AI assistant"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-[11px] text-slate-500">Gemini · knows your store&apos;s live numbers</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="New chat" aria-label="New chat">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
            {messages.length === 0 && (
              <div>
                <p className="text-slate-600">Ask anything about running the store: posts, product copy, customer replies, sale ideas, or how to use the dashboard. English, Urdu or Roman Urdu.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-left text-[13px] text-slate-700 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 whitespace-pre-wrap text-white">{m.text}</div>
              ) : (
                <div key={i} className="mr-4">
                  <div className={cn("rounded-2xl rounded-bl-md px-3.5 py-2.5", m.error ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-800")}>
                    {m.error ? m.text : <Formatted text={m.text} />}
                  </div>
                  {!m.error && <div className="mt-1"><CopyButton text={m.text} /></div>}
                </div>
              )
            )}
            {pending && (
              <div className="mr-4 flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask anything… (Enter to send)"
                className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || pending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-700 disabled:bg-slate-300"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">AI can make mistakes. Check facts before publishing.</p>
          </form>
        </div>
      )}
    </>
  );
}
