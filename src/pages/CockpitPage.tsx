import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GitPullRequest,
  GitBranch,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  FileCode,
  Sparkles,
  Zap,
  ExternalLink,
  Send,
  Terminal,
  X,
  Layers,
  Cpu,
  Search,
  ArrowLeft,
  Check,
  Plus,
  Columns,
  GitMerge,
  Copy,
  AlertTriangle,
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
  description: string;
  brief: {
    risk: "low" | "medium" | "critical";
    reviewEstimate: string;
    coverageDelta: string;
    breakingChanges: number;
    summary: string;
    criticalPaths: string[];
    suggestedChecklist: string[];
  };
  tasks: { id: string; title: string; done: boolean; priority: "p0" | "p1" | "p2" }[];
  slackMessages: { id: string; user: string; avatar: string; time: string; text: string }[];
  diffFiles: {
    name: string;
    status: "modified" | "added" | "deleted";
    additions: number;
    deletions: number;
    lines: { type: "normal" | "add" | "del" | "header"; oldN?: number; newN?: number; text: string }[];
  }[];
}

const INITIAL_PRS: PRItem[] = [
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
    timeAgo: "12m ago",
    labels: ["backend", "concurrency", "p1"],
    description: "Replaces local memory mutex with distributed Redlock consensus across Redis cluster nodes. Includes automatic drift correction, renew heartbeat ticker, and failover validation.",
    brief: {
      risk: "medium",
      reviewEstimate: "12 mins",
      coverageDelta: "+4.2%",
      breakingChanges: 0,
      summary: "Switches concurrency coordinator from single-instance mutex to Redlock distributed consensus algorithm. Prevents split-brain state on multi-region failovers.",
      criticalPaths: ["ConnectionPool.acquire", "RedlockConsensus.renewHeartbeat", "RedisCluster.validateQuorum"],
      suggestedChecklist: [
        "Verify clock drift tolerance buffer (set to 50ms)",
        "Check cluster retry backoff on network split",
        "Validate lock handle release on process SIGTERM",
      ],
    },
    tasks: [
      { id: "CRX-410", title: "Implement Redlock distributed mutex algorithm", done: true, priority: "p0" },
      { id: "CRX-411", title: "Add TTL extension heartbeat ticker", done: true, priority: "p1" },
      { id: "CRX-412", title: "Verify cluster partitioned network split scenario", done: false, priority: "p1" },
      { id: "CRX-413", title: "Benchmark lock acquisition under 10k req/sec load", done: false, priority: "p2" },
    ],
    slackMessages: [
      {
        id: "m-1",
        user: "sarah.chen",
        avatar: "SC",
        time: "10:42 AM",
        text: "Just pushed the failover tests for the distributed mutex. Can @alex check the acquire timeout and quorum calculation?",
      },
      {
        id: "m-2",
        user: "alex.morris",
        avatar: "AM",
        time: "10:48 AM",
        text: "Reviewing now in Cockpit. The clock drift compensation in Redlock looks mathematically sound.",
      },
    ],
    diffFiles: [
      {
        name: "src/concurrency/redlock.ts",
        status: "modified",
        additions: 38,
        deletions: 12,
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
      {
        name: "src/concurrency/heartbeat.ts",
        status: "added",
        additions: 24,
        deletions: 0,
        lines: [
          { type: "header", text: "@@ -0,0 +1,24 @@ // Lock Heartbeat Keep-Alive Ticker" },
          { type: "add", newN: 1, text: "+export class LockHeartbeatTicker {" },
          { type: "add", newN: 2, text: "+  private timer: NodeJS.Timeout | null = null;" },
          { type: "add", newN: 3, text: "+  constructor(private readonly lock: LockHandle, private readonly intervalMs: number) {}" },
          { type: "add", newN: 4, text: "+  start() {" },
          { type: "add", newN: 5, text: "+    this.timer = setInterval(async () => {" },
          { type: "add", newN: 6, text: "+      const renewed = await this.lock.extend(this.intervalMs * 3);" },
          { type: "add", newN: 7, text: "+      if (!renewed) this.stop();" },
          { type: "add", newN: 8, text: "+    }, this.intervalMs);" },
          { type: "add", newN: 9, text: "+  }" },
          { type: "add", newN: 10, text: "+  stop() { if (this.timer) clearInterval(this.timer); }" },
          { type: "add", newN: 11, text: "+}" },
        ],
      },
      {
        name: "src/concurrency/__tests__/lock.test.ts",
        status: "added",
        additions: 18,
        deletions: 0,
        lines: [
          { type: "header", text: "@@ -0,0 +1,18 @@ // Distributed Lock Test Suite" },
          { type: "add", newN: 1, text: "+describe('DistributedLockManager', () => {" },
          { type: "add", newN: 2, text: "+  it('should achieve quorum across 3 healthy nodes', async () => {" },
          { type: "add", newN: 3, text: "+    const lockManager = new DistributedLockManager(mockClusterNodes);" },
          { type: "add", newN: 4, text: "+    const lock = await lockManager.acquire('order-sync-109', 5000);" },
          { type: "add", newN: 5, text: "+    expect(lock).not.toBeNull();" },
          { type: "add", newN: 6, text: "+    expect(lock?.isValid()).toBe(true);" },
          { type: "add", newN: 7, text: "+  });" },
          { type: "add", newN: 8, text: "+});" },
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
    description: "Offloads syntax tree parsing to WebAssembly SIMD worker threads to reduce client freeze on giant pull requests.",
    brief: {
      risk: "low",
      reviewEstimate: "18 mins",
      coverageDelta: "+8.1%",
      breakingChanges: 0,
      summary: "Tree-sitter WASM worker pool implementation. Reduces PR parsing cold start from 1.4s to 210ms.",
      criticalPaths: ["AstWorkerPool.dispatch", "WasmMemoryBridge.copyBuffer"],
      suggestedChecklist: ["Validate fallback when SharedArrayBuffer is unsupported in browser context"],
    },
    tasks: [
      { id: "CRX-388", title: "Compile Tree-sitter core to wasm32-wasi target", done: true, priority: "p0" },
      { id: "CRX-389", title: "Benchmark SIMD throughput on 50k+ LOC diffs", done: true, priority: "p1" },
    ],
    slackMessages: [
      {
        id: "m-3",
        user: "elena.rostova",
        avatar: "ER",
        time: "9:15 AM",
        text: "WASM memory bridge passed all stress tests on 100k line diffs without memory leaks.",
      },
    ],
    diffFiles: [
      {
        name: "packages/parser-wasm/src/bridge.rs",
        status: "modified",
        additions: 8,
        deletions: 2,
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
  {
    id: "pr-3",
    number: 340,
    title: "fix(auth): enforce tenant cryptographic boundary on guest token exchange",
    author: "marcus.vance",
    avatar: "MV",
    branch: "fix/tenant-boundary-enforcement",
    targetBranch: "main",
    status: "open",
    checks: "pending",
    additions: 118,
    deletions: 34,
    filesChanged: 1,
    timeAgo: "3h ago",
    labels: ["security", "auth", "audit-required"],
    description: "Validates workspace asymmetric signature on ephemeral sandbox guest links to prevent cross-org token replay.",
    brief: {
      risk: "critical",
      reviewEstimate: "25 mins",
      coverageDelta: "+12.0%",
      breakingChanges: 0,
      summary: "Prevents forged sandbox guest session replay by enforcing RS256 tenant claims.",
      criticalPaths: ["JwtVerifier.validateOrgClaim", "SandboxSessionManager.createGuest"],
      suggestedChecklist: ["Run fuzz test against expired signature tokens"],
    },
    tasks: [
      { id: "CRX-428", title: "Add RS256 workspace public key rotation check", done: true, priority: "p0" },
      { id: "CRX-429", title: "Penetration test simulated guest token hijacking", done: false, priority: "p0" },
    ],
    slackMessages: [
      {
        id: "m-4",
        user: "marcus.vance",
        avatar: "MV",
        time: "8:00 AM",
        text: "Please hold merge until SecOps finishes the automated fuzzing on guest token signature validity.",
      },
    ],
    diffFiles: [
      {
        name: "src/auth/token-verifier.ts",
        status: "modified",
        additions: 4,
        deletions: 1,
        lines: [
          { type: "header", text: "@@ -88,6 +88,14 @@ export class TokenVerifier" },
          { type: "normal", oldN: 88, newN: 88, text: "    const payload = jwt.verify(token, secret);" },
          { type: "add", newN: 89, text: "+    if (payload.orgId !== requestContext.tenantId) {" },
          { type: "add", newN: 90, text: "+      throw new TenantIsolationViolationException('Cross-tenant signature token rejected');" },
          { type: "add", newN: 91, text: "+    }" },
        ],
      },
    ],
  },
];

export function CockpitPage() {
  const [prs, setPrs] = useState<PRItem[]>(INITIAL_PRS);
  const [selectedPrId, setSelectedPrId] = useState<string>("pr-1");
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "draft" | "merged">("all");
  const [leftNavTab, setLeftNavTab] = useState<"prs" | "files">("prs");
  const [rightPanelTab, setRightPanelTab] = useState<"brief" | "tasks" | "chat">("brief");
  const [diffMode, setDiffMode] = useState<"unified" | "split">("unified");
  const [reviewStatus, setReviewStatus] = useState<"pending" | "approved" | "changes_requested">("pending");
  const [reviewFeedbackToast, setReviewFeedbackToast] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [showAddTask, setShowAddTask] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>("");

  const [sandboxModalOpen, setSandboxModalOpen] = useState<boolean>(false);
  const [sandboxBooting, setSandboxBooting] = useState<boolean>(false);
  const [sandboxProgress, setSandboxProgress] = useState<number>(0);
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([]);

  const currentPr = useMemo(() => {
    return prs.find((p) => p.id === selectedPrId) || prs[0];
  }, [prs, selectedPrId]);

  const activeFile = useMemo(() => {
    return currentPr.diffFiles[activeFileIndex] || currentPr.diffFiles[0];
  }, [currentPr, activeFileIndex]);

  const filteredPrs = useMemo(() => {
    return prs.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.number.toString().includes(searchQuery);
      const matchStatus = statusFilter === "all" ? true : p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prs, searchQuery, statusFilter]);

  const handleToggleTask = (taskId: string) => {
    setPrs((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPrId) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
        };
      })
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: `CRX-${Math.floor(Math.random() * 800 + 400)}`,
      title: newTaskTitle.trim(),
      done: false,
      priority: "p1" as const,
    };
    setPrs((prev) =>
      prev.map((p) => (p.id === selectedPrId ? { ...p, tasks: [...p.tasks, newTask] } : p))
    );
    setNewTaskTitle("");
    setShowAddTask(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      user: "you (tech lead)",
      avatar: "TL",
      time: "Just now",
      text: chatMessage.trim(),
    };
    setPrs((prev) =>
      prev.map((p) => (p.id === selectedPrId ? { ...p, slackMessages: [...p.slackMessages, newMsg] } : p))
    );
    setChatMessage("");
  };

  const triggerReviewAction = (action: "approved" | "changes_requested") => {
    setReviewStatus(action);
    setReviewFeedbackToast(
      action === "approved"
        ? "✓ Approved PR #" + currentPr.number + " and dispatched approval event to GitHub & Slack."
        : "⚠️ Changes requested on PR #" + currentPr.number + ". Notified author."
    );
    setTimeout(() => setReviewFeedbackToast(null), 3500);
  };

  const handleMergePR = () => {
    setPrs((prev) =>
      prev.map((p) => (p.id === selectedPrId ? { ...p, status: "merged" } : p))
    );
    setReviewFeedbackToast("🚀 PR #" + currentPr.number + " successfully merged into main branch.");
    setTimeout(() => setReviewFeedbackToast(null), 4000);
  };

  const launchSandbox = () => {
    setSandboxModalOpen(true);
    setSandboxBooting(true);
    setSandboxProgress(15);
    setSandboxLogs([
      "[microvm-init] Allocating Firecracker VM isolate on node-us-east-1...",
      "[microvm-init] Bootstrapped Linux 6.8 kernel in 24ms",
    ]);

    setTimeout(() => {
      setSandboxProgress(50);
      setSandboxLogs((prev) => [
        ...prev,
        "[docker-layer] Mounted container image crux-app:v2.4",
        `[git-patch] Injected PR #${currentPr.number} (${currentPr.branch}) changes`,
        "[seed-data] Populated 12,500 Redis distributed records",
      ]);
    }, 800);

    setTimeout(() => {
      setSandboxProgress(85);
      setSandboxLogs((prev) => [
        ...prev,
        "[tunnel] Created TLS ingress proxy: https://sandbox-pr" + currentPr.number + ".crux.dev",
        "[sync-hub] Connected 2 virtual test browser sessions",
      ]);
    }, 1600);

    setTimeout(() => {
      setSandboxProgress(100);
      setSandboxBooting(false);
      setSandboxLogs((prev) => [
        ...prev,
        "✓ MicroVM environment ready. Interactive socket tunnel active.",
      ]);
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f0f2f5] flex flex-col font-sans select-none overflow-hidden">
      
      {reviewFeedbackToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#181b22] border border-white/20 text-xs font-mono text-[#f0f2f5] shadow-2xl flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
          <span>{reviewFeedbackToast}</span>
        </div>
      )}

      {/* TOP COCKPIT HEADER */}
      <header className="h-13 bg-[#111318] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#9aa2ae] hover:text-[#f0f2f5] text-xs font-medium transition-colors"
            title="Return to Marketing Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Landing</span>
          </Link>

          <div className="h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-2">
            <img
              src="/crux-logo.png"
              alt="Crux Logo"
              className="w-5 h-5 object-contain"
            />
            <span className="font-semibold text-sm text-[#f0f2f5] tracking-tight">Crux</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#9aa2ae] border border-white/[0.06] hidden md:inline">
              crux-oss / crux-core
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-[#8a93a2]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161820] border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WebSocket 34ms</span>
            <span className="text-white/20">•</span>
            <span className="text-[#c4cbd4]">3 reviewers active</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={launchSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d26] hover:bg-[#222734] border border-white/[0.12] text-[#e2e6eb] text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            <Play className="w-3 h-3 fill-current text-[#d0d6e0]" />
            <span>Run Sandbox</span>
          </button>

          <button
            onClick={() => triggerReviewAction("changes_requested")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#a0a8b6] hover:text-[#f0f2f5] text-xs font-medium transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Request Changes</span>
          </button>

          <button
            onClick={() => triggerReviewAction("approved")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reviewStatus === "approved"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-[#f0f2f5]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{reviewStatus === "approved" ? "Approved" : "Approve PR"}</span>
          </button>

          {currentPr.status !== "merged" ? (
            <button
              onClick={handleMergePR}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e6eaf0] hover:bg-white text-[#0c0d10] text-xs font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)] active:scale-95"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge</span>
            </button>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-medium">
              Merged
            </div>
          )}
        </div>
      </header>

      {/* 3-COLUMN COCKPIT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* COLUMN 1: PR LIST & FILE TREE */}
        <div className="lg:col-span-3 bg-[#0e1015] border-r border-white/[0.08] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-white/[0.06] bg-[#12141a] flex items-center gap-1">
            <button
              onClick={() => setLeftNavTab("prs")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                leftNavTab === "prs"
                  ? "bg-[#1b1e27] text-[#f0f2f5] border border-white/[0.1] shadow-sm"
                  : "text-[#8a93a2] hover:text-[#c4cbd4]"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Pull Requests</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-[#8e97a5]">
                {filteredPrs.length}
              </span>
            </button>

            <button
              onClick={() => setLeftNavTab("files")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                leftNavTab === "files"
                  ? "bg-[#1b1e27] text-[#f0f2f5] border border-white/[0.1] shadow-sm"
                  : "text-[#8a93a2] hover:text-[#c4cbd4]"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Files Tree</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-[#8e97a5]">
                {currentPr.diffFiles.length}
              </span>
            </button>
          </div>

          {leftNavTab === "prs" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/[0.06] space-y-2 bg-[#0e1015]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#687180]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search PR title, author, #..."
                    className="w-full bg-[#14171f] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#f0f2f5] placeholder-[#5a6270] focus:outline-none focus:border-white/20"
                  />
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(["all", "open", "draft", "merged"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 rounded capitalize transition-colors ${
                        statusFilter === st
                          ? "bg-white/[0.1] text-[#f0f2f5] font-semibold"
                          : "text-[#6e7786] hover:text-[#a0a8b6]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {filteredPrs.map((pr) => {
                  const isSelected = pr.id === selectedPrId;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => {
                        setSelectedPrId(pr.id);
                        setActiveFileIndex(0);
                      }}
                      className={`p-3.5 cursor-pointer transition-all flex flex-col gap-2 ${
                        isSelected
                          ? "bg-[#161922] border-l-2 border-[#e6eaf0]"
                          : "hover:bg-[#12141a] border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#8a93a2]">#{pr.number}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
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

                      <h4 className="font-medium text-xs text-[#e2e6eb] leading-snug line-clamp-2">
                        {pr.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-[#6e7786] pt-1">
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
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-mono text-[#6e7786] uppercase tracking-wider px-2 py-1">
                Modified Files ({currentPr.diffFiles.length})
              </div>
              {currentPr.diffFiles.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                    idx === activeFileIndex
                      ? "bg-[#181b24] text-[#f0f2f5] border border-white/[0.12]"
                      : "text-[#8a93a2] hover:bg-[#13151b] hover:text-[#c4cbd4]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#8e97a5] shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0 ml-2">
                    <span className="text-emerald-400">+{file.additions}</span>
                    <span className="text-rose-400">-{file.deletions}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: LIVE DIFF VIEWER */}
        <div className="lg:col-span-6 bg-[#0c0d10] border-r border-white/[0.08] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.08] bg-[#12141a] space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#8a93a2] mb-1">
                  <span className="text-[#f0f2f5] font-bold">#{currentPr.number}</span>
                  <span>•</span>
                  <span>Created by {currentPr.author} {currentPr.timeAgo}</span>
                </div>
                <h1 className="text-base font-bold text-[#f0f2f5] leading-snug">
                  {currentPr.title}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setDiffMode("unified")}
                  className={`p-1.5 rounded text-xs transition-colors ${
                    diffMode === "unified"
                      ? "bg-white/[0.1] text-white"
                      : "text-[#6e7786] hover:text-white"
                  }`}
                  title="Unified View"
                >
                  <FileCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDiffMode("split")}
                  className={`p-1.5 rounded text-xs transition-colors ${
                    diffMode === "split"
                      ? "bg-white/[0.1] text-white"
                      : "text-[#6e7786] hover:text-white"
                  }`}
                  title="Split View"
                >
                  <Columns className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-[#8e97a5] flex-wrap pt-1">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] text-[#d2d7e0]">
                <GitBranch className="w-3 h-3 text-[#687180]" />
                <span>{currentPr.branch}</span>
              </div>
              <span>→</span>
              <span className="text-[#8a93a2]">{currentPr.targetBranch}</span>
              <span className="text-white/10">|</span>
              <span className="text-emerald-400 font-semibold">+{currentPr.additions}</span>
              <span className="text-rose-400 font-semibold">-{currentPr.deletions}</span>
              <span className="text-white/10">|</span>
              <span className="text-[#8a93a2]">{currentPr.filesChanged} files modified</span>
            </div>
          </div>

          {/* File Tabs */}
          <div className="flex items-center border-b border-white/[0.06] bg-[#0e1015] overflow-x-auto px-2 shrink-0">
            {currentPr.diffFiles.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(idx)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono border-b-2 transition-all whitespace-nowrap ${
                  idx === activeFileIndex
                    ? "border-[#e6eaf0] text-[#f0f2f5] bg-[#161820]"
                    : "border-transparent text-[#7c8594] hover:text-[#c4cbd4]"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.name.split("/").pop()}</span>
                <span className="text-[10px] text-emerald-400">+{file.additions}</span>
              </button>
            ))}
          </div>

          {/* Diff Content Viewer */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-[#0c0d10]">
            <div className="text-[11px] text-[#6a7382] px-3 py-1 font-mono flex items-center justify-between mb-2">
              <span>Diff file: <strong className="text-[#d0d6e0]">{activeFile.name}</strong></span>
              <span className="text-[10px] uppercase bg-white/[0.04] px-1.5 py-0.5 rounded text-[#8e97a5]">
                {activeFile.status}
              </span>
            </div>

            <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-[#0c0d10]">
              {activeFile.lines.map((line, idx) => {
                if (line.type === "header") {
                  return (
                    <div
                      key={idx}
                      className="px-3 py-1.5 bg-[#141720] text-[#8e97a5] text-[10px] select-none font-semibold border-l-2 border-white/20"
                    >
                      {line.text}
                    </div>
                  );
                }
                if (line.type === "add") {
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-2.5 py-0.5 bg-emerald-950/25 text-emerald-300 border-l-2 border-emerald-500/70 hover:bg-emerald-950/35 transition-colors"
                    >
                      <span className="w-8 text-right text-emerald-600/70 select-none mr-3 shrink-0">
                        {line.newN}
                      </span>
                      <span className="w-3 text-emerald-400 select-none shrink-0">+</span>
                      <span className="flex-1 whitespace-pre-wrap">{line.text.slice(1)}</span>
                    </div>
                  );
                }
                if (line.type === "del") {
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-2.5 py-0.5 bg-rose-950/25 text-rose-300 border-l-2 border-rose-500/70 hover:bg-rose-950/35 transition-colors"
                    >
                      <span className="w-8 text-right text-rose-600/70 select-none mr-3 shrink-0">
                        {line.oldN}
                      </span>
                      <span className="w-3 text-rose-400 select-none shrink-0">-</span>
                      <span className="flex-1 whitespace-pre-wrap line-through opacity-80">
                        {line.text.slice(1)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="flex items-start px-2.5 py-0.5 text-[#9aa2ae] border-l-2 border-transparent hover:bg-white/[0.02]"
                  >
                    <span className="w-8 text-right text-[#454c58] select-none mr-3 shrink-0">
                      {line.oldN}
                    </span>
                    <span className="w-3 select-none shrink-0" />
                    <span className="flex-1 whitespace-pre-wrap">{line.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: AI BRIEF, TASKS, & SLACK */}
        <div className="lg:col-span-3 bg-[#0e1015] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-white/[0.06] bg-[#12141a] flex items-center gap-1">
            <button
              onClick={() => setRightPanelTab("brief")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                rightPanelTab === "brief"
                  ? "bg-[#1b1e27] text-[#f0f2f5] border border-white/[0.1] shadow-sm"
                  : "text-[#8a93a2] hover:text-[#c4cbd4]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
              <span>AI Brief</span>
            </button>

            <button
              onClick={() => setRightPanelTab("tasks")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                rightPanelTab === "tasks"
                  ? "bg-[#1b1e27] text-[#f0f2f5] border border-white/[0.1] shadow-sm"
                  : "text-[#8a93a2] hover:text-[#c4cbd4]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tasks</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">
                {currentPr.tasks.filter((t) => t.done).length}/{currentPr.tasks.length}
              </span>
            </button>

            <button
              onClick={() => setRightPanelTab("chat")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                rightPanelTab === "chat"
                  ? "bg-[#1b1e27] text-[#f0f2f5] border border-white/[0.1] shadow-sm"
                  : "text-[#8a93a2] hover:text-[#c4cbd4]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Slack</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">
                {currentPr.slackMessages.length}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {rightPanelTab === "brief" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#14171f] border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8e97a5]">
                      Review Impact Assessment
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#f0f2f5]">
                      Est. {currentPr.brief.reviewEstimate}
                    </span>
                  </div>

                  <p className="text-xs text-[#b8bfcc] leading-relaxed">
                    {currentPr.brief.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                    <div className="p-2 rounded bg-white/[0.02]">
                      <span className="text-[10px] text-[#6e7786] block">Coverage Delta</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {currentPr.brief.coverageDelta}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.02]">
                      <span className="text-[10px] text-[#6e7786] block">Breaking Changes</span>
                      <span className="text-[#f0f2f5] font-bold text-sm">
                        {currentPr.brief.breakingChanges}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-[#7e8796] uppercase tracking-wider">
                    Critical Execution Vectors
                  </div>
                  <div className="space-y-1.5">
                    {currentPr.brief.criticalPaths.map((path, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-lg bg-[#14161e] border border-white/[0.06] text-xs font-mono text-[#c2c8d2] flex items-center gap-2"
                      >
                        <Zap className="w-3 h-3 text-[#a0a8b6] shrink-0" />
                        <span className="truncate">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-[#7e8796] uppercase tracking-wider">
                    Recommended Verification Checklist
                  </div>
                  <div className="space-y-1.5">
                    {currentPr.brief.suggestedChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-[#11131a] border border-white/[0.04] text-xs text-[#9aa2ae] flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#8e97a5] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {rightPanelTab === "tasks" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#8a93a2]">Linked Linear Tickets</span>
                  <button
                    onClick={() => setShowAddTask(!showAddTask)}
                    className="flex items-center gap-1 text-xs text-[#d0d6e0] hover:text-white px-2 py-0.5 rounded bg-white/[0.04]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Task</span>
                  </button>
                </div>

                {showAddTask && (
                  <form onSubmit={handleAddTask} className="p-2.5 rounded-lg bg-[#14171f] border border-white/10 space-y-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Verify lock recovery on SIGTERM"
                      className="w-full bg-[#0c0d10] border border-white/[0.08] rounded p-2 text-xs text-[#f0f2f5] placeholder-[#5a6270] focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTask(false)}
                        className="px-2 py-1 text-[11px] text-[#8e97a5]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-[#e6eaf0] text-[#0c0d10] text-[11px] font-semibold"
                      >
                        Save Task
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {currentPr.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className="w-full text-left p-3 rounded-xl bg-[#13151c] hover:bg-[#181b24] border border-white/[0.06] transition-all flex items-start gap-2.5 group"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {}}
                        className="mt-0.5 accent-[#d0d6e0] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs leading-snug font-medium ${
                            task.done ? "line-through text-[#687180]" : "text-[#d6dbe4]"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-[#687180]">{task.id}</span>
                          <span className="text-[9px] uppercase font-mono px-1 rounded bg-white/[0.04] text-[#8e97a5]">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rightPanelTab === "chat" && (
              <div className="flex flex-col h-full space-y-3">
                <div className="text-xs font-mono text-[#8a93a2] flex items-center justify-between">
                  <span>#eng-reviews (Slack Sync)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {currentPr.slackMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-xl bg-[#13151c] border border-white/[0.05] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-semibold text-[#e2e6eb]">
                          <span className="w-4 h-4 rounded-full bg-white/[0.08] text-[#d0d6e0] flex items-center justify-center text-[9px] font-mono">
                            {msg.avatar}
                          </span>
                          <span>{msg.user}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#687180]">{msg.time}</span>
                      </div>
                      <p className="text-xs text-[#a5adbb] leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="pt-2 border-t border-white/[0.06] flex gap-1.5">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Reply to Slack thread..."
                    className="flex-1 bg-[#14171f] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#f0f2f5] placeholder-[#5a6270] focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#e6eaf0] hover:bg-white text-[#0c0d10] rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SANDBOX MODAL */}
      {sandboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#12141a] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-12 bg-[#161820] border-b border-white/[0.08] px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#d0d6e0]" />
                <span className="font-semibold text-sm text-[#f0f2f5]">
                  Instant Test Sandbox — PR #{currentPr.number}
                </span>
              </div>
              <button
                onClick={() => setSandboxModalOpen(false)}
                className="p-1 rounded-lg text-[#8e97a5] hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#9aa2ae]">
                  <span>Container Instance: Firecracker MicroVM ({currentPr.branch})</span>
                  <span>{sandboxProgress}% Ready</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e6eaf0] transition-all duration-300"
                    style={{ width: `${sandboxProgress}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0c0d10] border border-white/[0.08] rounded-xl p-4 font-mono text-xs text-[#c2c8d2] space-y-1.5 min-h-[160px] max-h-56 overflow-y-auto">
                {sandboxLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                {sandboxBooting && (
                  <div className="flex items-center gap-2 text-[#687180] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span>Booting isolated test branch...</span>
                  </div>
                )}
              </div>

              {!sandboxBooting && (
                <div className="p-4 rounded-xl bg-[#151821] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#f0f2f5]">Live Guest Session Active</span>
                    <span className="text-emerald-400 font-mono">● 2 users connected</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-[#0c0d10] border border-white/[0.06] text-xs font-mono text-[#9aa2ae]">
                    <span className="truncate flex-1">
                      https://sandbox-pr{currentPr.number}.crux.dev?guest=tk_981aef
                    </span>
                    <button
                      onClick={() => alert("Copied guest sandbox link to clipboard!")}
                      className="p-1 text-[#8e97a5] hover:text-white"
                      title="Copy Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#14161e] border-t border-white/[0.06] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSandboxModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#c4cbd4]"
              >
                Close Window
              </button>
              <button
                disabled={sandboxBooting}
                onClick={() => alert("Opening full sandbox preview viewport in split window...")}
                className="px-4 py-2 rounded-lg bg-[#e6eaf0] hover:bg-white disabled:opacity-50 text-[#0c0d10] text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.18)]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Split Preview</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
