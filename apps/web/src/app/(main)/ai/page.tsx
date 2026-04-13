"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, RotateCcw, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Movie } from "@reelrank/shared";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What should I watch tonight?",
  "Recommend something like my top-ranked movie",
  "I want something totally new and unexpected",
  "Help me pick a movie for a group",
];

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

function MovieCard({ searchQuery }: { searchQuery: string }) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.ai.movieSearch(searchQuery)
      .then((res) => {
        if (!cancelled && res.data) setMovie(res.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex gap-3 p-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] animate-pulse">
        <div className="w-[60px] h-[90px] rounded bg-[#222] shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-3/4 bg-[#222] rounded" />
          <div className="h-3 w-1/2 bg-[#222] rounded" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
        <Sparkles className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm text-text">{searchQuery}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/movie/${movie.id}`}
      className="flex gap-3 p-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-colors group"
    >
      {movie.posterPath ? (
        <Image
          src={`${TMDB_IMG}${movie.posterPath}`}
          alt=""
          width={60}
          height={90}
          className="w-[60px] h-[90px] rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-[60px] h-[90px] rounded bg-[#222] shrink-0 flex items-center justify-center text-[#555] text-xs">
          No img
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-text truncate group-hover:text-white transition-colors">
            {movie.title}
          </h4>
          <ExternalLink className="w-3 h-3 text-text-secondary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-text-secondary mt-0.5">
          {movie.releaseDate?.slice(0, 4)}
          {movie.voteAverage > 0 && <> &middot; {movie.voteAverage.toFixed(1)} / 10</>}
        </p>
        {movie.overview && (
          <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
            {movie.overview}
          </p>
        )}
      </div>
    </Link>
  );
}

function ChoiceButtons({
  options,
  onSelect,
  disabled,
}: {
  options: string[];
  onSelect: (option: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function renderStyledText(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let m;

  while ((m = boldRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(<span key={`${keyPrefix}-t-${lastIdx}`}>{text.slice(lastIdx, m.index)}</span>);
    }
    parts.push(
      <span key={`${keyPrefix}-b-${m.index}`} className="text-accent font-semibold">{m[1]}</span>
    );
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(<span key={`${keyPrefix}-t-${lastIdx}`}>{text.slice(lastIdx)}</span>);
  }

  return parts;
}

function parseContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[MOVIE_SEARCH:([^\]]+)\]|\[MOVIE:(\d+):([^\]]+)\]|\[CHOICES:([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderStyledText(text.slice(lastIndex, match.index), `s-${lastIndex}`));
    }

    if (match[1]) {
      parts.push(
        <div key={`m-${match.index}`} className="my-2">
          <MovieCard searchQuery={match[1]} />
        </div>
      );
    } else if (match[2] && match[3]) {
      parts.push(
        <div key={`m-${match.index}`} className="my-2">
          <MovieCard searchQuery={match[3]} />
        </div>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderStyledText(text.slice(lastIndex), `s-${lastIndex}`));
  }

  return parts;
}

function extractChoices(text: string): string[] | null {
  const match = text.match(/\[CHOICES:([^\]]+)\]/);
  if (!match) return null;
  return match[1].split("|").map((s) => s.trim()).filter(Boolean);
}

function MessageBubble({
  message,
  isStreaming,
  onChoiceSelect,
  isLast,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  onChoiceSelect: (choice: string) => void;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  const choices = !isUser && !isStreaming ? extractChoices(message.content) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] ${
          isUser
            ? "bg-accent/15 border border-accent/20 rounded-2xl rounded-br-md px-4 py-2.5"
            : "text-text"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed text-text whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {parseContent(message.content)}
            {isStreaming && isLast && (
              <span className="inline-block w-1.5 h-4 bg-accent/60 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
        {choices && (
          <ChoiceButtons
            options={choices}
            onSelect={onChoiceSelect}
            disabled={isStreaming}
          />
        )}
      </div>
    </motion.div>
  );
}

const STORAGE_KEY = "reelrank-ai-chat";

function loadChat(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveChat(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChat);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      saveChat(messages);
    }
  }, [messages, isStreaming]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = { role: "user", content: content.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      const assistantMessage: ChatMessage = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMessage]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await api.ai.chat(
          newMessages,
          (chunk) => {
            assistantMessage.content += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...assistantMessage };
              return updated;
            });
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          let msg = (err as Error).message || "Something went wrong";
          if (msg.includes("overloaded") || msg.includes("Overloaded")) {
            msg = "AI is temporarily busy. Please try again in a moment.";
          } else if (msg.includes("type") && msg.includes("error")) {
            try { msg = JSON.parse(msg).error?.message ?? msg; } catch { /* keep original */ }
          }
          setError(msg);
          if (!assistantMessage.content) {
            setMessages(newMessages);
          }
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setInput("");
    setError(null);
    setIsStreaming(false);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleChoiceSelect = (choice: string) => {
    sendMessage(choice);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-3rem)] md:h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-text">ReelRank AI</h1>
        </div>
        {!isEmpty && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            New chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-text mb-1">
                What are you in the mood for?
              </h2>
              <p className="text-sm text-text-secondary mb-8 max-w-sm">
                I know your taste. Tell me what you&apos;re feeling and I&apos;ll find the perfect movie.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => sendMessage(starter)}
                    className="w-full text-left px-4 py-3 text-sm rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] text-text-secondary hover:text-text hover:border-[rgba(255,255,255,0.15)] transition-colors cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={`${i}-${msg.role}`}
                  message={msg}
                  isStreaming={isStreaming}
                  onChoiceSelect={handleChoiceSelect}
                  isLast={i === messages.length - 1}
                />
              ))}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-2"
                >
                  {error}
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="border-t border-[rgba(255,255,255,0.06)] px-4 md:px-6 py-3">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about movies..."
            className="flex-1 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-[#555] focus:outline-none focus:border-accent/40 transition-colors"
            disabled={isStreaming}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
