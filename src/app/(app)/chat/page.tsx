"use client";

import { useState, useEffect, useRef } from "react";
import { AnalystResponse, ChatMessage } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import {
  Send,
  Loader2,
  Lightbulb,
  AlertTriangle,
  ListChecks,
  Sparkles,
} from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Where am I spending the most money?",
  "What subscriptions can I cancel to save money?",
  "How healthy is my budget this month?",
  "What are my biggest financial risks right now?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await apiFetch("/api/chat");
        const data = await res.json();
        if (res.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (!res.ok) {
          console.warn("[Chat] loadHistory:", res.status, data?.error ?? data);
        }
      } catch (e) {
        console.warn("[Chat] loadHistory failed:", e);
      }
      setHistoryLoading(false);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: "",
      role: "user",
      content: question.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        const serverError = typeof data?.error === "string" ? data.error : data?.message ?? `HTTP ${res.status}`;
        console.error("[Chat] API error:", res.status, data);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          user_id: "",
          role: "assistant",
          content: `Sorry, something went wrong (${res.status}). ${serverError}. Check the browser console (F12) for details.`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        return;
      }

      const response: AnalystResponse = data.response;
      if (!response?.explanation) {
        console.error("[Chat] Unexpected response shape:", data);
        throw new Error("Invalid response from server");
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: "",
        role: "assistant",
        content: response.explanation,
        metadata: response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error("[Chat] Request failed:", e);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: "",
        role: "assistant",
        content: "Sorry, something went wrong. Please try again. Check the browser console (F12) for details.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Analyst</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Ask questions about your spending, savings, and financial health.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/30 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Ask me anything about your finances
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
              I have access to your transaction history and can provide personalized insights and recommendations.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 max-w-lg w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-left text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <AssistantMessage content={msg.content} metadata={msg.metadata} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Analyzing your data...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances... (press / to focus)"
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function AssistantMessage({
  content,
  metadata,
}: {
  content: string;
  metadata?: AnalystResponse | null;
}) {
  if (!metadata) {
    return <p className="text-sm text-slate-700 dark:text-slate-300">{content}</p>;
  }

  const insights = Array.isArray(metadata.insights) ? metadata.insights : [];
  const risks = Array.isArray(metadata.risks) ? metadata.risks : [];
  const actions = Array.isArray(metadata.recommended_actions) ? metadata.recommended_actions : [];
  const explanation = typeof metadata.explanation === "string" ? metadata.explanation : content;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 dark:text-slate-300">{explanation}</p>

      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Insights
            </span>
          </div>
          <ul className="space-y-1">
            {insights.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-300 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-blue-400 dark:before:text-blue-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Risks
            </span>
          </div>
          <ul className="space-y-1">
            {risks.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-300 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-red-400 dark:before:text-red-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ListChecks className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Recommended Actions
            </span>
          </div>
          <ul className="space-y-1.5">
            {actions.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-300 pl-5 relative before:content-['→'] before:absolute before:left-0.5 before:text-emerald-500 dark:before:text-emerald-400">
                {item.action}
                {item.estimated_monthly_impact > 0 && (
                  <span className="ml-1.5 inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Save ~${item.estimated_monthly_impact}/mo
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
