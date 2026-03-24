"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Compass,
  BarChart3,
  Clapperboard,
  ArrowRight,
  Film,
  Star,
  Sparkles,
  Play,
  Smartphone,
  MonitorSmartphone,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Eye,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

const POSTER_MOVIES = [
  { title: "Inception", poster: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { title: "The Dark Knight", poster: "/qJ2tW6WMUDux911jawTx2GHOASw.jpg" },
  { title: "Interstellar", poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { title: "Parasite", poster: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { title: "Dune", poster: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg" },
  { title: "Oppenheimer", poster: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { title: "Spider-Verse", poster: "/8Vt6mWEReuy7Of61Lnj5Xj704m8.jpg" },
  { title: "Everything Everywhere", poster: "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg" },
  { title: "The Godfather", poster: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { title: "Pulp Fiction", poster: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg" },
  { title: "Fight Club", poster: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { title: "The Matrix", poster: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { title: "Whiplash", poster: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg" },
  { title: "La La Land", poster: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg" },
];

const POSTER_MOVIES_2 = [
  { title: "Joker", poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { title: "Get Out", poster: "/qba4ACIDfMcbLshl15KnbMGFMfj.jpg" },
  { title: "Arrival", poster: "/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg" },
  { title: "Mad Max", poster: "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg" },
  { title: "Blade Runner 2049", poster: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  { title: "1917", poster: "/iZf0KyrE25z1sage4SYFLCCrMi9.jpg" },
  { title: "Knives Out", poster: "/pThyQovXQrw2m0s9x82twj48Jq4.jpg" },
  { title: "The Batman", poster: "/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
  { title: "No Country", poster: "/bj1v6YKF8yHqA489GFfAWcKENvr.jpg" },
  { title: "John Wick", poster: "/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg" },
  { title: "Hereditary", poster: "/4GFPuL14eXi9PnEEPMEoSMFlavx.jpg" },
  { title: "The Revenant", poster: "/ji3ecJphATlVgWNY0B4RKm4y1pC.jpg" },
  { title: "Moonlight", poster: "/4911T5FbJ9eD2Faz5Z8cT3SUhU3.jpg" },
  { title: "Dunkirk", poster: "/ebSnODDg9lbsMIaWg2uAbjn7TO5.jpg" },
];

const STEPS = [
  {
    num: "01",
    title: "Create a Room",
    description: "Start a group session and share the code with your friends. Everyone joins in seconds.",
    icon: Users,
  },
  {
    num: "02",
    title: "Everyone Submits Movies",
    description: "Each person adds movies they'd like to watch. Build a pool of options together.",
    icon: Film,
  },
  {
    num: "03",
    title: "Swipe as a Group",
    description: "Everyone swipes through the combined list. The algorithm finds the movie everyone agrees on.",
    icon: Heart,
  },
  {
    num: "04",
    title: "See the Results",
    description: "Instantly see the group's top pick. No more arguments — just press play.",
    icon: Play,
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "Group Mode",
    description: "The end of 'what should we watch?' debates. Everyone swipes, and the perfect movie emerges.",
    accent: true,
  },
  {
    icon: Compass,
    title: "Smart Discovery",
    description: "Swipe through curated movies. Right to add to your watchlist, left to skip. Your taste builds your feed.",
  },
  {
    icon: Clapperboard,
    title: "This or That",
    description: "Head-to-head matchups that precision-rank your favorites. Build your ultimate movie ranking.",
  },
  {
    icon: BarChart3,
    title: "Personal Stats",
    description: "Track everything — films ranked, genres explored, watch patterns. Your cinema journey, quantified.",
  },
  {
    icon: Star,
    title: "Watchlist & Logging",
    description: "Never forget a recommendation. Log what you watch with ratings, venues, and notes.",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions",
    description: "Personalized recommendations powered by your swipe history and ranking patterns.",
  },
];

function PosterCard({ title, poster, index }: { title: string; poster: string; index: number }) {
  return (
    <div className="shrink-0 w-[120px] md:w-[150px]">
      <div className="aspect-[2/3] rounded-lg overflow-hidden relative group">
        <Image
          src={`https://image.tmdb.org/t/p/w342${poster}`}
          alt={title}
          width={150}
          height={225}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function SwipeCardMockup() {
  return (
    <motion.div
      className="relative w-[220px] md:w-[260px] mx-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Background card */}
      <div className="absolute top-3 left-3 right-3 aspect-[2/3] rounded-2xl bg-[#111] border border-[rgba(255,255,255,0.04)] transform rotate-3" />
      <div className="absolute top-1.5 left-1.5 right-1.5 aspect-[2/3] rounded-2xl bg-[#151515] border border-[rgba(255,255,255,0.05)] transform -rotate-1" />
      {/* Front card */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-2xl">
        <Image
          src="https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg"
          alt="Dune"
          width={260}
          height={390}
          className="w-full h-full object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-base font-semibold">Dune</p>
          <p className="text-xs text-[#888] mt-0.5">2021 · Sci-Fi</p>
        </div>
      </div>
      {/* Swipe indicators */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="w-12 h-12 rounded-full border-2 border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#888]">
          <ThumbsDown className="w-5 h-5" />
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-[rgba(255,45,85,0.4)] bg-[rgba(255,45,85,0.1)] flex items-center justify-center text-[#ff2d55]">
          <Heart className="w-5 h-5" />
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#888]">
          <Eye className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function GroupMockup() {
  return (
    <motion.div
      className="relative max-w-[340px] mx-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* Phone frame */}
      <div className="relative bg-[#0a0a0a] rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-3 shadow-2xl">
        <div className="bg-[#000] rounded-[1.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[10px] text-[#888]">9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-2 bg-[#888] rounded-sm" />
              <div className="w-1.5 h-2 bg-[#888] rounded-sm" />
            </div>
          </div>
          {/* Room code */}
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xl font-mono font-bold tracking-widest text-[#e8e8e8]">XKQM</span>
              <span className="text-[10px] text-[#888]">Copy</span>
            </div>
            <p className="text-[10px] text-[#888]">Share this code with your group</p>
          </div>
          {/* Members */}
          <div className="px-5 pb-2">
            <p className="text-[9px] uppercase tracking-widest text-[#888] mb-2">Members · 4</p>
            {["Sean", "Jonah", "Ali", "Magda"].map((name, i) => (
              <div key={name} className="flex items-center gap-2 py-1.5">
                <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center">
                  <span className="text-[8px] text-[#888]">{name[0]}</span>
                </div>
                <span className="text-xs text-[#e8e8e8]">{name}</span>
                {i === 0 && <span className="text-[9px] text-[#ff2d55]">host</span>}
              </div>
            ))}
          </div>
          {/* Start button */}
          <div className="px-5 pt-3 pb-5">
            <div className="bg-[#ff2d55] text-white text-xs font-semibold text-center py-2 rounded-full">
              Start
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultsMockup() {
  return (
    <motion.div
      className="relative max-w-[300px] mx-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="bg-[#0a0a0a] rounded-2xl border border-[rgba(255,255,255,0.08)] p-5 shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-[#ff2d55] mb-3 text-center">GROUP PICK</p>
        <div className="flex justify-center mb-3">
          <div className="w-[100px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl">
            <Image
              src="https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
              alt="Interstellar"
              width={100}
              height={150}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </div>
        <p className="text-sm font-semibold text-center">Interstellar</p>
        <p className="text-[10px] text-[#888] text-center mt-0.5">4/4 members agreed</p>
        <div className="mt-3 flex items-center justify-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-[#111] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
              <ThumbsUp className="w-3 h-3 text-[#ff2d55]" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleSocial = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    const fn = provider === "google" ? signInWithGoogle : signInWithApple;
    const label = provider === "google" ? "Google" : "Apple";
    try {
      if (isMobile) {
        await fn("redirect");
        return;
      }
      await fn("popup");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") {
        // User intentionally closed the popup
      } else if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        toast.info(`Popup blocked — redirecting to ${label} sign-in...`);
        try {
          await fn("redirect");
        } catch {
          toast.error(`${label} redirect failed. Please try again.`);
        }
        return;
      } else if (code === "auth/operation-not-allowed") {
        toast.error(`${label} sign-in is not configured. Use email/password for now.`);
      } else if (code === "auth/unauthorized-domain") {
        toast.error(`This domain isn't authorized for ${label} sign-in.`);
      } else {
        const msg = err instanceof Error ? err.message : `${label} sign-in failed`;
        toast.error(msg);
        console.error(`[ReelRank] ${label} sign-in error:`, err);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#000] text-[#e8e8e8] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-[#000]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Film className="w-5 h-5 text-[#ff2d55]" />
          <span className="text-lg font-bold tracking-tight">ReelRank</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowAuth(true); setIsSignUp(false); }}
            className="text-sm text-[#888] hover:text-[#e8e8e8] transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <Button onClick={() => { setShowAuth(true); setIsSignUp(true); }} size="sm">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20 px-6 md:px-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(255,45,85,0.1)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(255,45,85,0.3)] bg-[rgba(255,45,85,0.06)] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
              <span className="text-xs text-[#ff2d55] font-medium tracking-wide">GROUP MODE IS HERE</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
            Never argue about
            <br />
            <span className="text-[#ff2d55]">what to watch</span>
            <br />
            again.
          </motion.h1>

          <motion.p
            className="mt-6 md:mt-8 text-lg md:text-xl text-[#888] max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          >
            ReelRank uses group swiping to find the one movie everyone wants to watch.
            Discover, rank, and decide — together.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Button
              size="lg"
              className="text-base px-8 h-12"
              onClick={() => { setShowAuth(true); setIsSignUp(true); }}
            >
              Start for free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors cursor-pointer group"
            >
              <span className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center justify-center group-hover:border-[rgba(255,255,255,0.3)] transition-colors">
                <Play className="w-3 h-3 ml-0.5" />
              </span>
              See how it works
            </button>
          </motion.div>

          <motion.div
            className="mt-12 flex items-center justify-center gap-6 text-xs text-[#555]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <span className="flex items-center gap-1.5">
              <MonitorSmartphone className="w-3.5 h-3.5" /> Web & Mobile
            </span>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
            <span>Free to use</span>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
            <span>No ads</span>
          </motion.div>
        </div>
      </section>

      {/* Movie Poster Marquee */}
      <section className="py-8 md:py-12 overflow-hidden">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10" />
          <motion.div
            className="flex gap-3 py-2 will-change-transform"
            animate={{ x: [0, -1800] }}
            transition={{ duration: 40, ease: "linear", repeat: Infinity }}
          >
            {[...POSTER_MOVIES, ...POSTER_MOVIES].map((movie, i) => (
              <PosterCard key={`${movie.title}-${i}`} title={movie.title} poster={movie.poster} index={i} />
            ))}
          </motion.div>
        </div>
        <div className="relative mt-3">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10" />
          <motion.div
            className="flex gap-3 py-2 will-change-transform"
            animate={{ x: [-1800, 0] }}
            transition={{ duration: 45, ease: "linear", repeat: Infinity }}
          >
            {[...POSTER_MOVIES_2, ...POSTER_MOVIES_2].map((movie, i) => (
              <PosterCard key={`${movie.title}-${i}`} title={movie.title} poster={movie.poster} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* App Showcase - Swipe Discovery */}
      <section className="py-20 md:py-28 px-6 md:px-10 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">DISCOVER</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Swipe your way to<br />the perfect watchlist.
              </h2>
              <p className="text-[#888] leading-relaxed mb-6">
                Like Tinder, but for movies. Swipe right on films you want to watch,
                left to skip. Every swipe teaches ReelRank your taste — so your
                recommendations get smarter over time.
              </p>
              <div className="flex gap-4 text-sm text-[#888]">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4" />
                  <span>Skip</span>
                </div>
                <div className="flex items-center gap-2 text-[#ff2d55]">
                  <Heart className="w-4 h-4" />
                  <span>Love it</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Watched</span>
                </div>
              </div>
            </motion.div>
            <SwipeCardMockup />
          </div>
        </div>
      </section>

      {/* How Group Mode Works */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 md:px-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,45,85,0.02)] to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <motion.div
            className="text-center mb-16 md:mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">HOW IT WORKS</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Group decisions,<br />made effortless.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  className={`relative p-6 md:p-8 rounded-2xl border transition-all duration-500 ${
                    activeStep === i
                      ? "border-[rgba(255,45,85,0.3)] bg-[rgba(255,45,85,0.04)]"
                      : "border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]"
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`text-3xl md:text-4xl font-bold transition-colors duration-500 ${
                        activeStep === i ? "text-[#ff2d55]" : "text-[rgba(255,255,255,0.08)]"
                      }`}>
                        {step.num}
                      </span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500 ${
                        activeStep === i ? "bg-[#ff2d55]/20 text-[#ff2d55]" : "bg-[rgba(255,255,255,0.04)] text-[#555]"
                      }`}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-[#888] leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                  {activeStep === i && (
                    <motion.div
                      className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff2d55] to-transparent"
                      layoutId="step-indicator"
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Group Mode Visual Spotlight */}
      <section className="py-20 md:py-28 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,45,85,0.03)] to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <GroupMockup />
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">GROUP MODE</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                One room. One code.<br />
                <span className="text-[#ff2d55]">One perfect pick.</span>
              </h2>
              <p className="text-[#888] leading-relaxed mb-6">
                Create a room and share the code. Everyone joins, submits their movie picks, then
                swipes through the combined list. ReelRank&apos;s algorithm finds the movie that
                everyone actually wants to watch.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-[#e8e8e8]">
                  <span className="w-5 h-5 rounded-full bg-[#ff2d55]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#ff2d55]">✓</span>
                  </span>
                  Real-time sync via websockets
                </li>
                <li className="flex items-center gap-2 text-[#e8e8e8]">
                  <span className="w-5 h-5 rounded-full bg-[#ff2d55]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#ff2d55]">✓</span>
                  </span>
                  Works on any device
                </li>
                <li className="flex items-center gap-2 text-[#e8e8e8]">
                  <span className="w-5 h-5 rounded-full bg-[#ff2d55]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#ff2d55]">✓</span>
                  </span>
                  Smart consensus algorithm
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Results Showcase */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">RESULTS</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                The group has spoken.
              </h2>
              <p className="text-[#888] leading-relaxed mb-6">
                See the movie everyone wants to watch, who voted for what, and dive into
                bonus rounds if you can&apos;t decide. No more compromising — it&apos;s democracy for movie night.
              </p>
            </motion.div>
            <ResultsMockup />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">FEATURES</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need<br />for movie night.
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:border-[rgba(255,255,255,0.12)] ${
                    feature.accent
                      ? "border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.04)] md:col-span-2 lg:col-span-1"
                      : "border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]"
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    feature.accent
                      ? "bg-[#ff2d55]/20 text-[#ff2d55]"
                      : "bg-[rgba(255,255,255,0.05)] text-[#888] group-hover:text-[#e8e8e8]"
                  } transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#888] leading-relaxed">{feature.description}</p>
                  {feature.accent && (
                    <div className="absolute top-4 right-4">
                      <span className="text-[10px] uppercase tracking-widest text-[#ff2d55] font-medium px-2 py-1 rounded-full border border-[rgba(255,45,85,0.3)]">
                        Flagship
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why ReelRank Comparison */}
      <section className="py-24 md:py-32 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,45,85,0.03)] to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d55] font-medium mb-4">WHY REELRANK</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              The only app where<br />
              <span className="text-[#ff2d55]">everyone picks together.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <motion.div
              className="p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs uppercase tracking-widest text-[#555] mb-4">Without ReelRank</p>
              <ul className="space-y-3 text-sm text-[#888]">
                <li className="flex items-start gap-2">
                  <span className="text-[#555] mt-0.5">✕</span>
                  &quot;What do you want to watch?&quot; &quot;I don&apos;t know, you pick.&quot;
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#555] mt-0.5">✕</span>
                  20 minutes scrolling through Netflix
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#555] mt-0.5">✕</span>
                  Someone always compromises
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#555] mt-0.5">✕</span>
                  Half the group hasn&apos;t heard of the pick
                </li>
              </ul>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.04)]"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs uppercase tracking-widest text-[#ff2d55] mb-4">With ReelRank</p>
              <ul className="space-y-3 text-sm text-[#e8e8e8]">
                <li className="flex items-start gap-2">
                  <span className="text-[#ff2d55] mt-0.5">✓</span>
                  Everyone submits movies they&apos;d enjoy
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff2d55] mt-0.5">✓</span>
                  30 seconds of swiping, done
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff2d55] mt-0.5">✓</span>
                  Algorithm finds the consensus pick
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff2d55] mt-0.5">✓</span>
                  Everyone actually wants to watch it
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform */}
      <section className="py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-[#888]" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                <MonitorSmartphone className="w-6 h-6 text-[#888]" />
              </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Everywhere you watch.
            </h2>
            <p className="text-lg text-[#888] max-w-xl mx-auto">
              Available on web and mobile. Start a group session on your phone, join from your laptop.
              Your watchlist and rankings sync across all devices.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,45,85,0.1)_0%,transparent_70%)]" />
        </div>

        <motion.div
          className="max-w-2xl mx-auto text-center relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready for movie night?
          </h2>
          <p className="text-lg text-[#888] mb-10">
            Join the smarter way to decide what to watch. Free, no ads, ever.
          </p>
          <Button
            size="lg"
            className="text-base px-10 h-12"
            onClick={() => { setShowAuth(true); setIsSignUp(true); }}
          >
            Get started free
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-12 px-6 md:px-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#ff2d55]" />
            <span className="text-sm font-semibold">ReelRank</span>
          </div>
          <p className="text-xs text-[#555]">
            Built by Sean Tomany · Boston University · {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAuth(false)} />

            <motion.div
              className="relative w-full sm:max-w-sm bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl p-8 max-h-[90dvh] overflow-y-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 text-[#555] hover:text-[#888] transition-colors cursor-pointer text-lg"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-6">
                <Film className="w-5 h-5 text-[#ff2d55]" />
                <span className="text-lg font-bold">ReelRank</span>
              </div>

              <h2 className="text-xl font-semibold mb-1">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-sm text-[#888] mb-6">
                {isSignUp ? "Start discovering and ranking movies." : "Sign in to continue."}
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocial("google")}
                  disabled={socialLoading !== null}
                  className="w-full flex items-center justify-center gap-3 h-10 rounded-full border border-[rgba(255,255,255,0.1)] bg-[#111] hover:bg-[#1a1a1a] transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === "google" ? (
                    <div className="w-4 h-4 border-2 border-[#888] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                  {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
                </button>
                <button
                  onClick={() => handleSocial("apple")}
                  disabled={socialLoading !== null}
                  className="w-full flex items-center justify-center gap-3 h-10 rounded-full border border-[rgba(255,255,255,0.1)] bg-[#111] hover:bg-[#1a1a1a] transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === "apple" ? (
                    <div className="w-4 h-4 border-2 border-[#888] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AppleIcon className="w-4 h-4" />
                  )}
                  {socialLoading === "apple" ? "Signing in..." : "Continue with Apple"}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
                <span className="text-xs text-[#555]">or</span>
                <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {isSignUp ? "Create account" : "Sign in"}
                </Button>
              </form>

              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-4 text-sm text-[#888] hover:text-[#aaa] cursor-pointer w-full text-center"
              >
                {isSignUp ? "Have an account? Sign in" : "Need an account? Create one"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
