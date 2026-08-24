import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  GitPullRequest,
  GitBranch,
  FileCode,
  Sparkles,
  Zap,
  ArrowRight,
  Maximize2,
  Layers,
} from "lucide-react";

interface PRItem {
  id: string;
  number: number;
  title: string;
  author: string;
  avatar: string;
  branch: string;
  targetBranch: string;
  status: "open" | "draft" | "merged";
  checks: "passing" | "pending" | "failing";
  additions: number;
  deletions: number;
  filesChanged: number;
  timeAgo: string;
  labels: string[];
  brief: {
    risk: "low" | "medium" | "critical";
    reviewEstimate: string;
    coverageDelta: string;
    breakingChanges: number;
    summary: string;
    criticalPaths: string[];
  };
  tasks: { id: string; title: string; done: boolean; priority: "p0" | "p1" | "p2" }[];
  diffFiles: {
    name: string;
    status: "modified" | "added";
    lines: { type: "normal" | "add" | "del" | "header"; oldN?: number; newN?: number; text: string }[];
  }[];
}

const MOCK_PRS: PRItem[] = [
  {
    id: "pr-1",
    number: 342,
    title: "feat(core): implement distributed lock in Redis sync engine",
    author: "sarah.chen",
    avatar: "SC",
    branch: "feat/redis-distributed-lock",
    targetBranch: "main",
    status: "open",
    checks: "passing",
    additions: 284,
    deletions: 42,
    filesChanged: 3,
    timeAgo: "14m ago",
    labels: ["backend", "concurrency", "p1"],
    brief: {
      risk: "medium",
      reviewEstimate: "12 mins",
      coverageDelta: "+4.2%",
      breakingChanges: 0,
      summary:
        "Replaces optimistic locking with Redlock distributed consensus algorithm. Mitigates queue corruption on multi-region failover. Includes auto-renew TTL heartbeat.",
      criticalPaths: ["ConnectionPool.acquire", "RedlockConsensus.renewHeartbeat"],
    },
    tasks: [
      { id: "CRX-410", title: "Implement Redlock distributed mutex algorithm", done: true, priority: "p0" },
      { id: "CRX-411", title: "Add TTL extension heartbeat ticker", done: true, priority: "p1" },
      { id: "CRX-412", title: "Verify cluster partitioned network split scenario", done: false, priority: "p1" },
    ],
    diffFiles: [
      {
        name: "src/concurrency/redlock.ts",
        status: "modified",
        lines: [
          { type: "header", text: "@@ -44,12 +44,38 @@ export class DistributedLockManager" },
          { type: "normal", oldN: 44, newN: 44, text: "  private readonly instances: RedisClient[];" },
          { type: "normal", oldN: 45, newN: 45, text: "  private readonly quorum: number;" },
          { type: "del", oldN: 46, text: "-  async acquire(resource: string, ttlMs: number): Promise<boolean> {" },
          { type: "del", oldN: 47, text: "-    return await this.instances[0].set(resource, 'locked', 'PX', ttlMs) === 'OK';" },
          { type: "add", newN: 46, text: "+  async acquire(resource: string, ttlMs: number): Promise<LockHandle | null> {" },
          { type: "add", newN: 47, text: "+    const value = crypto.randomUUID();" },
          { type: "add", newN: 48, text: "+    const startTime = Date.now();" },
          { type: "add", newN: 49, text: "+    let achievedVotes = 0;" },
          { type: "add", newN: 50, text: "+    " },
          { type: "add", newN: 51, text: "+    for (const client of this.instances) {" },
          { type: "add", newN: 52, text: "+      const success = await client.set(resource, value, 'NX', 'PX', ttlMs);" },
          { type: "add", newN: 53, text: "+      if (success === 'OK') achievedVotes++;" },
          { type: "add", newN: 54, text: "+    }" },
          { type: "add", newN: 55, text: "+    " },
          { type: "add", newN: 56, text: "+    const validityTime = ttlMs - (Date.now() - startTime) - CLOCK_DRIFT_BUFFER;" },
          { type: "add", newN: 57, text: "+    if (achievedVotes >= this.quorum && validityTime > 0) {" },
          { type: "add", newN: 58, text: "+      return new LockHandle(resource, value, validityTime, this);" },
          { type: "add", newN: 59, text: "+    }" },
          { type: "normal", oldN: 48, newN: 60, text: "    return null;" },
          { type: "normal", oldN: 49, newN: 61, text: "  }" },
        ],
      },
    ],
  },
  {
    id: "pr-2",
    number: 341,
    title: "perf(indexer): vectorize AST parsing with webassembly worker pool",
    author: "elena.rostova",
    avatar: "ER",
    branch: "perf/wasm-ast-vectorizer",
    targetBranch: "main",
    status: "open",
    checks: "passing",
    additions: 512,
    deletions: 189,
    filesChanged: 2,
    timeAgo: "1h ago",
    labels: ["wasm", "performance", "parser"],
    brief: {
      risk: "low",
      reviewEstimate: "18 mins",
      coverageDelta: "+8.1%",
      breakingChanges: 0,
      summary:
        "Offloads TypeScript / Rust AST generation to threaded WASM SIMD modules. Reduces initial PR indexing latency from 1.4s to 210ms.",
      criticalPaths: ["AstWorkerPool.dispatch", "WasmMemoryBridge.copyBuffer"],
    },
    tasks: [
      { id: "CRX-388", title: "Compile Tree-sitter core to wasm32-wasi target", done: true, priority: "p0" },
      { id: "CRX-389", title: "Benchmark SIMD throughput on 50k+ LOC diffs", done: true, priority: "p1" },
    ],
    diffFiles: [
      {
        name: "packages/parser-wasm/src/bridge.rs",
        status: "modified",
        lines: [
          { type: "header", text: "@@ -12,8 +12,18 @@ pub fn parse_ast_parallel" },
          { type: "normal", oldN: 12, newN: 12, text: "pub fn parse_syntax_tree(buffer: &[u8]) -> AstNode {" },
          { type: "del", oldN: 13, text: "-    let parser = standard_tree_sitter();" },
          { type: "add", newN: 13, text: "+    let parser = SIMDVectorizedParser::new_with_threads(4);" },
          { type: "add", newN: 14, text: "+    parser.parse_buffer_zero_copy(buffer)" },
          { type: "normal", oldN: 14, newN: 15, text: "}" },
        ],
      },
    ],
  },
];

export function InteractiveCockpit() {
  const [selectedPrId, setSelectedPrId] = useState<string>("pr-1");
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [prs, setPrs] = useState<PRItem[]>(MOCK_PRS);

  const currentPr = prs.find((p) => p.id === selectedPrId) || prs[0];
  const activeFile = currentPr.diffFiles[activeFileIndex] || currentPr.diffFiles[0];

  const handleToggleTask = (taskId: string) => {
    setPrs((prev) =>
      prev.map((pr) => {
        if (pr.id !== selectedPrId) return pr;
        return {
          ...pr,
          tasks: pr.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
        };
      })
    );
  };

  return (
    <section id="cockpit-preview" className="relative py-20 md:py-28 z-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
              <span>Cockpit Preview</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f0f2f5] mb-3">
              The 3-Column Developer Cockpit
            </h2>
            <p className="text-sm text-[#9aa2ae]">
              Interactive preview below. PRs, live diffs, AI briefs, and real-time task sync unified in one screen.
            </p>
          </div>

          <Link
            to="/cockpit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e6eaf0] hover:bg-white text-[#0c0d10] text-xs font-semibold shadow-[0_0_25px_rgba(255,255,255,0.18)] transition-all shrink-0 w-fit active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Open Fullscreen Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {/* Cockpit Shell Window */}
        <div className="rounded-2xl border border-white/[0.12] bg-[#101217] shadow-[0_20px_70px_rgba(0,0,0,0.7)] overflow-hidden">
          
          {/* Top Window Bar */}
          <div className="h-11 bg-[#15181f] border-b border-white/[0.08] px-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#272b36] border border-white/[0.08]" />
              <span className="w-3 h-3 rounded-full bg-[#272b36] border border-white/[0.08]" />
              <span className="w-3 h-3 rounded-full bg-[#272b36] border border-white/[0.08]" />
              <span className="ml-3 text-xs font-mono text-[#687180] hidden sm:inline">
                crux-cockpit://org/crux-oss/workspace
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-[#a6aebc]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38c172] animate-pulse" />
                <span>Socket Synced</span>
              </div>
              <Link
                to="/cockpit"
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-[#f0f2f5] text-xs font-medium transition-all"
              >
                <span>Launch Full App</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px] text-xs">
            
            {/* Left Column */}
            <div className="lg:col-span-3 border-r border-white/[0.08] bg-[#0e1014] flex flex-col">
              <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <span className="font-semibold text-[#f0f2f5] flex items-center gap-2">
                  <GitPullRequest className="w-3.5 h-3.5 text-[#a0a8b6]" />
                  <span>Pull Requests</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8e97a5] font-mono text-[10px]">
                  {prs.length} Active
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {prs.map((pr) => {
                  const isSelected = pr.id === selectedPrId;
                  return (
                    <button
                      key={pr.id}
                      onClick={() => {
                        setSelectedPrId(pr.id);
                        setActiveFileIndex(0);
                      }}
                      className={`w-full text-left p-3.5 transition-all duration-150 flex flex-col gap-2 ${
                        isSelected
                          ? "bg-[#161920] border-l-2 border-[#e6eaf0]"
                          : "hover:bg-[#13151b] border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#8a93a2]">#{pr.number}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            pr.brief.risk === "critical"
                              ? "bg-red-500/10 text-red-300 border border-red-500/20"
                              : pr.brief.risk === "medium"
                              ? "bg-amber-500/10 text-amber-200 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {pr.brief.risk} risk
                        </span>
                      </div>

                      <div className="font-medium text-[#e2e6eb] leading-snug line-clamp-2">
                        {pr.title}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#6e7786]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-white/[0.08] text-[#d0d6e0] flex items-center justify-center font-mono font-bold text-[9px]">
                            {pr.avatar}
                          </span>
                          <span>{pr.author}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-emerald-400">+{pr.additions}</span>
                          <span className="text-rose-400">-{pr.deletions}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Column */}
            <div className="lg:col-span-6 bg-[#0c0d10] flex flex-col border-r border-white/[0.08]">
              <div className="p-3.5 border-b border-white/[0.08] bg-[#12141a]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-[#f0f2f5]">
                    #{currentPr.number} {currentPr.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#8e97a5] font-mono flex-wrap">
                  <span className="flex items-center gap-1 text-[#d2d7e0]">
                    <GitBranch className="w-3 h-3 text-[#687180]" />
                    {currentPr.branch}
                  </span>
                  <span>→</span>
                  <span className="text-[#8a93a2]">{currentPr.targetBranch}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed bg-[#0c0d10]">
                <div className="text-[10px] text-[#6a7382] px-3 py-1 font-mono">
                  Showing diff for: <span className="text-[#a5adbb]">{activeFile.name}</span>
                </div>
                {activeFile.lines.map((line, idx) => {
                  if (line.type === "header") {
                    return (
                      <div
                        key={idx}
                        className="my-1 px-3 py-1 rounded bg-[#161820] text-[#8e97a5] text-[10px] select-none font-semibold border-l-2 border-white/20"
                      >
                        {line.text}
                      </div>
                    );
                  }
                  if (line.type === "add") {
                    return (
                      <div
                        key={idx}
                        className="flex items-start px-2 py-0.5 bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500/60"
                      >
                        <span className="w-7 text-right text-emerald-600/60 select-none mr-2">
                          {line.newN}
                        </span>
                        <span className="w-3 text-emerald-400 select-none">+</span>
                        <span className="flex-1 whitespace-pre-wrap">{line.text.slice(1)}</span>
                      </div>
                    );
                  }
                  if (line.type === "del") {
                    return (
                      <div
                        key={idx}
                        className="flex items-start px-2 py-0.5 bg-rose-950/20 text-rose-300 border-l-2 border-rose-500/60"
                      >
                        <span className="w-7 text-right text-rose-600/60 select-none mr-2">
                          {line.oldN}
                        </span>
                        <span className="w-3 text-rose-400 select-none">-</span>
                        <span className="flex-1 whitespace-pre-wrap line-through opacity-80">
                          {line.text.slice(1)}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-2 py-0.5 text-[#9aa2ae] border-l-2 border-transparent"
                    >
                      <span className="w-7 text-right text-[#454c58] select-none mr-2">
                        {line.oldN}
                      </span>
                      <span className="w-3 select-none" />
                      <span className="flex-1 whitespace-pre-wrap">{line.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 bg-[#0e1014] flex flex-col divide-y divide-white/[0.06] overflow-y-auto">
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#f0f2f5]">
                    <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
                    <span>AI Reviewer Brief</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8a93a2]">
                    Est. {currentPr.brief.reviewEstimate}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#14171e] border border-white/[0.07] mb-3">
                  <p className="text-[11px] text-[#b3bac6] leading-relaxed mb-2">
                    {currentPr.brief.summary}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[#687180] block">Coverage</span>
                      <span className="text-emerald-400 font-semibold">
                        {currentPr.brief.coverageDelta}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#687180] block">Breaking</span>
                      <span className="text-[#d0d6e0] font-semibold">
                        {currentPr.brief.breakingChanges}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[#6e7786] mb-1 font-mono uppercase tracking-wider">
                  Critical Paths:
                </div>
                <div className="flex flex-col gap-1">
                  {currentPr.brief.criticalPaths.map((path, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] font-mono text-[10px] text-[#c2c8d2] flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-[#a0a8b6]" />
                      <span className="truncate">{path}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#f0f2f5] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#a0a8b6]" />
                    <span>Linear Tasks</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {currentPr.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className="w-full text-left p-2 rounded bg-[#13151b] hover:bg-[#191c24] border border-white/[0.05] transition-colors flex items-start gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {}}
                        className="mt-0.5 accent-[#d0d6e0] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[11px] leading-snug ${
                            task.done ? "line-through text-[#687180]" : "text-[#d6dbe4]"
                          }`}
                        >
                          {task.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
