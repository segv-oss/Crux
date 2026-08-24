import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Terminal,
  Check,
  Copy,
  Shield,
  Zap,
  Sparkles,
  GitPullRequest,
  Layers,
  MessageSquare,
  Cpu,
  Activity,
  GitBranch,
} from "lucide-react";
import anime from "animejs";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const heroLeftRef = useRef<HTMLDivElement>(null);
  const orbitalModelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroLeftRef.current) {
      anime({
        targets: heroLeftRef.current.querySelectorAll(".hero-left-anim"),
        translateX: [-20, 0],
        opacity: [0, 1],
        easing: "easeOutCubic",
        duration: 800,
        delay: anime.stagger(100),
      });
    }

    if (orbitalModelRef.current) {
      anime({
        targets: orbitalModelRef.current.querySelector(".orbital-ring-outer"),
        rotate: 360,
        easing: "linear",
        duration: 36000,
        loop: true,
      });

      anime({
        targets: orbitalModelRef.current.querySelector(".orbital-ring-inner"),
        rotate: -360,
        easing: "linear",
        duration: 24000,
        loop: true,
      });

      anime({
        targets: orbitalModelRef.current.querySelectorAll(".satellite-card"),
        translateY: [
          { value: -6, duration: 2400, easing: "easeInOutSine" },
          { value: 6, duration: 2800, easing: "easeInOutSine" },
        ],
        direction: "alternate",
        loop: true,
        delay: anime.stagger(400),
      });

      anime({
        targets: orbitalModelRef.current.querySelector(".core-pulse-emitter"),
        scale: [1, 1.45],
        opacity: [0.6, 0],
        easing: "easeOutQuad",
        duration: 2600,
        loop: true,
      });
    }
  }, []);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText("npx crux-app@latest");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: HERO HEADLINE, VALUE & ACTIONS */}
          <div ref={heroLeftRef} className="lg:col-span-7 text-left space-y-6">
            
            {/* Status Pill */}
            <div className="hero-left-anim inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#15181f] border border-white/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d0d6e0] shadow-[0_0_8px_#ffffff] animate-pulse" />
              <span className="text-xs font-mono text-[#c2c8d2]">
                Crux Engine 2.0 • Real-Time Convergence Hub
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-[#8e97a5]">
                Live
              </span>
            </div>

            {/* Main Bold Headline */}
            <h1 className="hero-left-anim text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#f0f2f5] leading-[1.08] font-sans">
              The unified cockpit for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#d6dbe4] to-[#7b8494]">
                code intelligence
              </span>{" "}
              and real-time review.
            </h1>

            {/* Subheading */}
            <p className="hero-left-anim text-base sm:text-lg text-[#9aa2ae] max-w-xl leading-relaxed font-normal">
              Stop context-switching between GitHub PRs, Linear tickets, and Slack threads.
              Crux collapses fragmented communication loops and AI reviewer briefs into a single,
              deterministic workspace.
            </p>

            {/* Action Buttons & Terminal Snippet */}
            <div className="hero-left-anim flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/cockpit"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#e6eaf0] hover:bg-white text-[#0c0d10] font-semibold text-sm transition-all duration-200 shadow-[0_0_25px_rgba(255,255,255,0.18)] hover:shadow-[0_0_35px_rgba(255,255,255,0.28)] active:scale-[0.98]"
              >
                <span>Open Dedicated Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#14171e] border border-white/[0.09] text-xs font-mono text-[#a5adbb]">
                <div className="flex items-center gap-2">
                  <span className="text-[#687180]">$</span>
                  <span>npx crux-app@latest</span>
                </div>
                <button
                  onClick={copyInstallCommand}
                  className="p-1.5 rounded-md hover:bg-white/[0.08] text-[#8e97a5] hover:text-[#f0f2f5] transition-colors"
                  title="Copy install command"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="hero-left-anim grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-6 border-t border-white/[0.06]">
              {[
                { metric: "40%", label: "Faster Turnaround", sub: "Pre-screened diffs" },
                { metric: "2.8h", label: "Saved / Dev / Wk", sub: "Zero tab fatigue" },
                { metric: "< 450ms", label: "Sync Latency", sub: "WebSocket mesh" },
                { metric: "0-Leak", label: "In-Memory AST", sub: "Zero persistence" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#12141a]/60 border border-white/[0.05] hover:border-white/[0.12] transition-colors"
                >
                  <div className="text-xl font-bold font-mono text-[#f0f2f5] tracking-tight">
                    {item.metric}
                  </div>
                  <div className="text-xs font-medium text-[#c4cbd4] mt-0.5">{item.label}</div>
                  <div className="text-[10px] text-[#697280]">{item.sub}</div>
                </div>
              ))}
            </div>

          </div>

          {/* RIGHT COLUMN: REAL-TIME CONVERGENCE ENGINE MODEL */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div
              ref={orbitalModelRef}
              className="relative w-full max-w-[460px] h-[460px] flex items-center justify-center select-none"
            >
              <div className="orbital-ring-outer absolute w-[420px] h-[420px] rounded-full border border-dashed border-white/[0.07] pointer-events-none" />

              <div className="orbital-ring-inner absolute w-[300px] h-[300px] rounded-full border border-white/[0.08] pointer-events-none flex items-center justify-between">
                <span className="w-2 h-2 rounded-full bg-[#d0d6e0]/60 -ml-1 shadow-[0_0_8px_#ffffff]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7a8494] -mr-0.5" />
              </div>

              <div className="core-pulse-emitter absolute w-24 h-24 rounded-full bg-white/[0.08] pointer-events-none" />
              
              <div className="relative z-20 w-24 h-24 rounded-2xl bg-gradient-to-b from-[#1c202a] via-[#14171f] to-[#0e1015] border border-white/[0.2] shadow-[0_0_50px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center group hover:scale-105 transition-transform duration-300">
                <img
                  src="/crux-logo.png"
                  alt="Crux Core"
                  className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                />
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#a5adbb] mt-1 font-bold">
                  Crux Core
                </span>
              </div>

              {/* SATELLITE NODE 1 */}
              <div className="satellite-card absolute -top-2 left-0 z-20 w-52 p-3 rounded-xl bg-[#14171e]/90 border border-white/[0.12] shadow-xl backdrop-blur-md hover:border-white/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f0f2f5]">
                    <GitPullRequest className="w-3.5 h-3.5 text-[#a0a8b6]" />
                    <span>PR #342 Ingestion</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#8a93a2] truncate mb-1">
                  feat/redis-distributed-lock
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-[#687180]">
                  <span className="text-emerald-400">+284 additions</span>
                  <span>14m ago</span>
                </div>
              </div>

              {/* SATELLITE NODE 2 */}
              <div className="satellite-card absolute top-12 -right-4 z-20 w-52 p-3 rounded-xl bg-[#14171e]/90 border border-white/[0.12] shadow-xl backdrop-blur-md hover:border-white/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f0f2f5]">
                    <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>AI Reviewer Brief</span>
                  </div>
                  <span className="text-[9px] font-mono px-1 rounded bg-white/[0.06] text-[#c4cbd4]">
                    30s scan
                  </span>
                </div>
                <div className="text-[10px] text-[#b0b8c6] leading-snug mb-1">
                  0 Breaking changes • +4.2% Coverage
                </div>
                <div className="text-[9px] font-mono text-[#687180]">
                  Vector: Redlock.renew()
                </div>
              </div>

              {/* SATELLITE NODE 3 */}
              <div className="satellite-card absolute -bottom-3 left-10 z-20 w-60 p-3 rounded-xl bg-[#14171e]/90 border border-white/[0.12] shadow-xl backdrop-blur-md hover:border-white/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f0f2f5]">
                    <Activity className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>Real-Time Event Mesh</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400">
                    34ms sync
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8e97a5] font-mono">
                  <span>Linear: CRX-410</span>
                  <span className="text-white/20">•</span>
                  <span>Slack: #eng-reviews</span>
                </div>
              </div>

              {/* Telemetry badge */}
              <div className="absolute bottom-20 -right-2 z-10 p-2 rounded-lg bg-[#0e1015]/80 border border-white/[0.07] font-mono text-[9px] text-[#697280] space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>AST: In-Memory Isolate</span>
                </div>
                <div>Heap: 18.4MB (0-persist)</div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
