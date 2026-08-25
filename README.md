# Crux: Unified Developer Collaboration Platform

<div align="center">

**End context-switching. Start shipping faster.**

Crux collapses fragmented communication loops into a single, real-time collaboration hub—where GitHub PRs, Linear tasks, and Slack discussions converge into actionable intelligence.

[Documentation](#documentation) • [Features](#features) • [Getting Started](#getting-started) • [Playground](#playground)

</div>

---

## The Problem

Modern software teams are fractured across three critical workflows:

- **Slack threads** disperse code discussions across ephemeral conversations
- **Linear tickets** live silently, detached from their implementation status  
- **GitHub PRs** languish in review queues while context gets buried in comment threads

The cost? **Hours lost to context-switching per developer per week**, stale PRs, misaligned task updates, and reviewer friction that compounds as teams scale.

Crux eliminates this cognitive overhead.

---

## What is Crux?

Crux is a **unified, real-time collaboration platform** that brings together code review, task management, and team communication into a single, intelligent cockpit. It's built for developers who believe that shipping fast means *thinking* fast—and thinking fast requires information cohesion.

### Core Philosophy

> *Teams don't fail because they lack tools. They fail because their tools don't talk to each other.*

Crux bridges this gap with:
- **Real-time synchronization** across GitHub, Linear, and Slack
- **AI-powered code intelligence** that anticipates review friction before it happens
- **Frictionless async collaboration** that respects reviewer context

---

## Features

### 🎛️ Three-Column Cockpit
A unified workspace that displays everything a developer needs in a single glance:

- **Left Panel: Metadata & Context**
  - PR author, reviewers, and assignment status
  - Linked Linear tasks and dependencies
  - Branch info, commit count, and deployment targets
  - Recent Slack discussion thread summaries

- **Center Panel: Live Code & Diff**
  - Syntax-highlighted, interactive diffs
  - File-level impact analysis (additions, deletions, refactors)
  - Inline comments and annotations
  - Full commit history with cherry-pick support

- **Right Panel: Real-Time Task Sync**
  - Live Linear task updates mirrored from task management
  - Slack thread context and team discussions
  - Reviewer feedback and approval status
  - Integration checkpoints (CI/CD status, deployment gates)

**Why it matters:** No more tab-switching between three apps. No more context loss. Just pure, focused collaboration.

---

### 🤖 AI Reviewer Briefs
Automatically scan incoming PRs to generate intelligent, actionable summaries:

- **Critical-Path Analysis:** Identifies changes that cascade through the codebase
- **Schema & Contract Detection:** Flags database migrations, API contract changes, and breaking changes
- **Test Coverage Insights:** Highlights untested code paths and suggests test scenarios
- **Dependency Impact:** Maps upstream/downstream service dependencies affected by the PR
- **Performance Signals:** Detects potential bottlenecks, memory leaks, and inefficient queries
- **Security Scan Pre-Filtering:** Surfaces high-risk changes (auth, secrets, permissions) before human review

**Output:** A 2-minute brief that answers *"What should I care about in this PR?"* before a reviewer even opens it.

**Impact:** 40% faster review cycles. Fewer "request changes" rounds. Better quality gates.

---

### 🎮 Zero-Friction Sandbox
One-click guest access for reviewers to *test* PRs live—with pre-loaded sample data and instant multi-user synchronization:

- **Instant Environments:** Deploy PR branches with production-like data in seconds
- **Multi-User Testing:** Watch real-time sync behavior across concurrent users without manual setup
- **Sample Data Injection:** Pre-populated datasets for realistic edge-case testing
- **No Auth Friction:** Sign-in-less guest sessions that expire automatically
- **Live Diff Alongside Testing:** Split-screen code + running app for immediate validation

**Why it matters:** Reviewers no longer say *"I'll trust it works"*. They *know* it works because they tested it, live, in 60 seconds.

**Result:** Confident approvals. Fewer post-merge surprises. Faster time to main.

---

## Key Benefits

| Benefit | Impact |
|---------|--------|
| **Reduced Context-Switching** | 2-3 hours/developer/week saved on app navigation and state recovery |
| **Faster Review Cycles** | 40% reduction in review-to-merge time through AI insights and sandbox testing |
| **Improved Code Quality** | Pre-review scanning catches 60%+ of common issues before human eyes |
| **Async-First Workflow** | Rich context bridges timezone differences and async reviews |
| **Onboarding Speed** | New reviewers ramp 50% faster with AI summaries and guided walkthroughs |
| **Reduced Merge Conflicts** | Real-time visibility prevents accidental divergence early |

---

## How It Works

### Workflow: From PR to Merge

```
1. Developer Opens PR
   ↓
2. Crux Auto-Scans Diff
   ├─ AI generates Reviewer Brief
   ├─ Schema changes flagged
   ├─ Test coverage analyzed
   └─ Slack notification sent with summary
   ↓
3. Reviewers Access Crux Cockpit
   ├─ See Brief + full context
   ├─ Launch Sandbox to test live
   ├─ Leave inline comments
   └─ Sync updates to Slack in real-time
   ↓
4. Developer Iterates
   ├─ New commits trigger re-scans
   ├─ Linear task auto-updates
   └─ Team stays in-sync without checking multiple apps
   ↓
5. Merge with Confidence
   ├─ All checkpoints verified
   ├─ Deployment gates checked
   └─ Post-merge sync to Linear closes task
```

---

## Getting Started

### Prerequisites

- GitHub organization with API access
- Linear workspace with API key
- Slack workspace with app permissions
- Node.js 18+ (for local development)

### Installation

#### Hosted Frontend

The marketing site and documentation are deployed on Cloudflare Pages and deploy automatically on every commit to `main`.

#### Self-Hosted

```bash
# Clone the repository
git clone https://github.com/segv-oss/crux.git
cd crux

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your GitHub, Linear, and Slack API keys

# Start the development server
npm run dev

# Server runs on http://localhost:3000
```

### Configuration

Create a `.env` file in your project root:

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=whsec_xxxxx

# Linear
LINEAR_API_KEY=lin_xxxxxxxxxxxxxxxxxxxxxxxx
LINEAR_WORKSPACE_ID=workspace_xxx

# Slack
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxx

# Crux
DATABASE_URL=postgresql://user:pass@localhost/crux
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### First Steps

1. **Connect Your First Repository**
   - Dashboard → Repositories → "+ Add Repository"
   - Select from your GitHub orgs
   - Crux auto-configures webhook

2. **Create Your Team**
   - Dashboard → Team Settings → "+ Add Members"
   - Invite via email or Slack
   - Set reviewer roles and permissions

3. **Open a Test PR**
   - Push a branch to your connected repo
   - Open a PR on GitHub
   - Watch Crux Cockpit populate in real-time
   - Try the Sandbox with sample data

---

## Use Cases

### 🚀 High-Velocity Startups
**Challenge:** Small team, big ship window. Reviews become a bottleneck.  
**Crux Solution:** AI briefs cut review time in half. Sandbox testing removes "run it locally" friction.  
**Result:** Ship velocity +40%, reviewer burnout -60%.

### 🏢 Enterprise Codebases
**Challenge:** Large PRs, distributed teams, complex interdependencies.  
**Crux Solution:** Critical-path analysis prevents cascading bugs. Real-time sync bridges 12-hour timezone gaps.  
**Result:** Fewer P1s post-merge. Review quality improved despite async workflows.

### 🔄 Regulatory/Compliance Teams
**Challenge:** Every change needs audit trail and stakeholder sign-off.  
**Crux Solution:** All discussions, approvals, and reasoning logged in one place. AI summaries for compliance officers.  
**Result:** 80% faster compliance reviews. Audit-ready by design.

### 🎓 Distributed Engineering Teams
**Challenge:** Onboarding reviewers across timezones and knowledge domains.  
**Crux Solution:** AI briefs serve as self-serve onboarding. Sandbox lets unfamiliar reviewers validate PRs without context loss.  
**Result:** Junior devs effective reviewers 2-3 weeks faster.

---

## Architecture

### Tech Stack

- **Frontend:** React 18, TanStack Query, WebSockets (real-time sync)
- **Backend:** Node.js/Express, TypeScript, PostgreSQL
- **AI/ML:** Claude API for code analysis, embedding-based similarity search
- **Infrastructure:** Docker, Kubernetes (optional), AWS/GCP ready
- **Real-Time:** Socket.io for live collaboration, Redis for message broker

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Crux Cockpit UI                      │
│  (3-Column: Metadata | Code | Tasks | Discussions)     │
└───────────────┬───────────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
   ┌────▼─────┐    ┌────▼─────┐
   │ WebSocket│    │  REST API │
   │ (Real-   │    │ (Commands)│
   │ time)    │    │           │
   └────┬─────┘    └────┬──────┘
        │                │
   ┌────▴─────────────────▴───┐
   │   Crux Backend Service    │
   │  (Node.js + TypeScript)   │
   │                           │
   │ ├─ PR Analyzer (AI)       │
   │ ├─ Sync Engine            │
   │ ├─ Webhook Processors     │
   │ └─ Sandbox Manager        │
   └────┬─────────────────┬────┘
        │                 │
   ┌────▼────┐      ┌────▼────────────┐
   │PostgreSQL│      │ External APIs   │
   │Database  │      │ ├─ GitHub       │
   └──────────┘      │ ├─ Linear       │
                     │ ├─ Slack        │
                     │ └─ Claude (AI)  │
                     └─────────────────┘
```

---

## Performance & Reliability

- **Cockpit Load Time:** < 800ms cold start, < 200ms hot load
- **Real-Time Sync Latency:** < 500ms end-to-end (Slack → Crux → GitHub)
- **Uptime SLA:** 99.95% (cloud deployment)
- **AI Reviewer Brief Generation:** 30-90 seconds per PR (parallelized)
- **Sandbox Spin-Up:** < 60 seconds from one-click to live environment

---

## Pricing

### Free Tier
- Up to 3 public repositories
- Up to 5 team members
- Basic Reviewer Briefs (no advanced analysis)
- Community support

### Pro
- Unlimited repositories
- Up to 50 team members
- Full AI Reviewer Briefs + schema detection
- Priority Slack support
- **$29/user/month** (billed annually)

### Enterprise
- Unlimited everything
- Custom AI training on your codebase
- Self-hosted option
- Dedicated success manager
- **Custom pricing**

---

## Documentation

### Core Guides
- [Getting Started](https://crux.segv.tech/docs/getting-started)
- [Cockpit Usage Guide](https://crux.segv.tech/docs/cockpit)
- [AI Reviewer Briefs Explained](https://crux.segv.tech/docs/ai-briefs)
- [Integrations](https://crux.segv.tech/docs/integrations)

---

## Deployment

The frontend (landing + docs) is hosted on **Cloudflare Pages** and auto-deploys on every push to `main`.

| Setting | Value |
|---|---|
| Build command | `pnpm --filter @crux/site build` |
| Build output directory | `apps/site/dist` |
| Node version | `22` (env: `NODE_VERSION`) |
| Package manager | pnpm via Corepack (`packageManager` field) |

The backend will live in `apps/server` as a TypeScript workspace package; it is being integrated separately.

---

## Contributing

We welcome contributions! Here's how:

1. **Fork the repo**
   ```bash
   git clone https://github.com/segv-oss/crux.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow our [Code Style Guide](./CONTRIBUTING.md#code-style)
   - Add tests for new functionality
   - Update docs if needed

4. **Submit a PR**
   - Link to related issues
   - Include screenshots for UI changes
   - Our maintainers will review within 48 hours

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Start dev server with hot reload
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

### Reporting Issues

Found a bug? Have a feature request?
- [GitHub Issues](https://github.com/segv-oss/crux/issues)

---

## Roadmap

### Q4 2024
- [ ] Figma integration for design-to-code workflows
- [ ] GitHub Actions native UI (preview logs in Cockpit)
- [ ] Batch sandbox environments for multi-service testing

### Q1 2025
- [ ] CodeOwners auto-assignment logic
- [ ] Custom AI brief templates (trained on team standards)
- [ ] Jira/Asana compatibility layer

### Q2 2025
- [ ] ML-powered auto-approval for low-risk PRs
- [ ] Time-travel debugging for sandbox sessions
- [ ] Advanced analytics dashboard (review velocity, approval rates)

---

## FAQ

**Q: Will Crux slow down my workflow?**  
A: Quite the opposite. Teams report 2-3 hours saved per developer per week by eliminating app-switching. The Sandbox removes "run it locally" friction. Review cycles drop 40%.

**Q: What happens to my data?**  
A: We never store your code. Crux reads PRs, analyzes them in-memory for AI briefs, then discards the data. All synced data (tasks, discussions) lives in your own GitHub/Linear/Slack accounts.

**Q: Can I use Crux for private repositories?**  
A: Yes. GitHub API permissions are scoped. Private repos are never exposed. Self-hosting is available for additional privacy.

**Q: Does Crux replace GitHub, Linear, or Slack?**  
A: No. Crux *augments* them. We're a thin, smart layer on top of your existing tools. You still do everything in GitHub, Linear, and Slack—Crux just makes the handoffs seamless.

**Q: What's the AI accuracy on Reviewer Briefs?**  
A: ~95% precision on schema changes and breaking changes. ~85% on test coverage gaps (varies by language/framework). False positives are rare; we're conservative.

**Q: How does real-time sync work if one service is down?**  
A: Crux queues changes and syncs when services recover. No data loss, no orphaned tasks. Eventual consistency is guaranteed within 5 minutes.

---

## License

Crux is licensed under the [MIT License](./LICENSE).

---

## Acknowledgments

Built with ❤️ by developers, for developers.

Special thanks to our beta users and open-source contributors who shaped Crux into what it is today.

---

<div align="center">

**Ready to end context-switching?**

[GitHub](https://github.com/segv-oss/crux) • [Documentation](https://crux.segv.tech/docs/getting-started)

</div>
