# Crux: Unified Developer Collaboration Platform

<div align="center">

**End context-switching. Start shipping faster.**

Crux collapses fragmented communication loops into a single, real-time collaboration hub—where GitHub PRs, Linear tasks, and Slack discussions converge into actionable intelligence.

[Documentation](#documentation) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Deployment & Custom Domains](#deployment--custom-domains)

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
  - PR author, reviewers, and approval status
  - Interactive linked Linear tasks (toggle completion directly)
  - Review decision composer (Approve, Request Changes, Comment)
  - Policy enforcement (quorum and required approvals)

- **Center Panel: Live Code & Diff**
  - Syntax-highlighted, interactive AST-based diff viewer
  - File-level impact analysis (additions, deletions, refactors)
  - Inline code comments with real-time sync
  - Fast keyboard shortcuts (⌘↵ to post comments)

- **Right Panel: Real-Time Live Sync & AI Briefs**
  - Automated Reviewer Briefs with risk scoring and checklist suggestions
  - Real-time event stream powered by Socket.IO
  - Live team discussion feed with instant chat composer
  - Dynamic CI/CD checks and merge status indicators

---

## Architecture & Monorepo Structure

Crux is engineered as a high-performance TypeScript monorepo powered by **Turborepo** and **pnpm workspaces**:

```
crux/
├── apps/
│   ├── site/            # Marketing & Documentation (React 19, Vite SSR, Tailwind CSS v4)
│   ├── cockpit/         # Interactive Cockpit Web App (React 19, Socket.IO client, Vite)
│   └── server/          # Backend API & WebSocket Engine (Hono, Node HTTP, Socket.IO, PostgreSQL, Redis)
├── packages/
│   ├── api-contract/    # Shared Zod schemas, OpenAPI specs, and TypeScript DTOs
│   └── config/          # Shared tooling and Tailwind configs
├── docker-compose.yml   # Local PostgreSQL 16 & Redis 7 stack
└── turbo.json           # Turbo build and pipeline configuration
```

### High-Level System Architecture

```
┌───────────────────────────────────────────────────────────┐
│              Crux Cockpit / Marketing Site                │
│    (React 19 · Vite · Tailwind v4 · Socket.IO Client)     │
└───────────────┬───────────────────────────┬───────────────┘
                │                           │
         WebSocket (Live Sync)       REST API (/api/v1)
                │                           │
┌───────────────▼───────────────────────────▼───────────────┐
│                    Crux API Server                        │
│       (Hono · Node Server · Socket.IO · TypeScript)       │
│                                                           │
│ ├─ PR & Review Quorum Engine    ├─ Multi-Tenant RBAC      │
│ ├─ Monotonic Event Journal      ├─ Outbox Relay & Queues  │
│ ├─ Idempotency Guard Fencing    ├─ Webhook HMAC Ingress   │
│ └─ Sandbox Proxy Security       └─ AI Brief Generator     │
└───────────────┬───────────────────────────┬───────────────┘
                │                           │
        ┌───────▼────────┐          ┌───────▼────────┐
        │   PostgreSQL   │          │     Redis      │
        │(Event Journal, │          │(Pub/Sub, Sync, │
        │ State, RBAC)   │          │  Rate Limits)  │
        └────────────────┘          └────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or v22+
- **Package Manager**: `pnpm` (v10+ recommended)
- **Docker**: For PostgreSQL and Redis

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/segv-oss/crux.git
cd crux

# 2. Install workspace dependencies
pnpm install

# 3. Start local database & cache
docker compose up -d

# 4. Run database migrations and seed data
pnpm db:migrate
pnpm db:seed

# 5. Start all services in development mode
# In separate terminal windows:
pnpm dev:server    # Backend API on http://localhost:4000
pnpm dev:cockpit   # Cockpit App on http://localhost:5174
pnpm dev:site      # Marketing Site on http://localhost:5173
```

---

## Deployment & Custom Domains

### 1. Landing Page & Documentation (`apps/site`) on Cloudflare Pages

The landing site is optimized for **Cloudflare Pages**:

1. In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select your repository and configure build settings:
   - **Framework preset**: `None` / `Vite`
   - **Build command**: `pnpm --filter @crux/site build`
   - **Build output directory**: `apps/site/dist`
   - **Environment variables**: `NODE_VERSION=22`
3. **Custom Domain Setup**:
   - In your Cloudflare Pages project, click **Custom domains** → **Set up a custom domain**.
   - Enter your domain (e.g. `crux.dev` or `yourdomain.com`).
   - If your domain DNS is managed on Cloudflare, DNS records and SSL/TLS edge certificates are created automatically.
   - If using external DNS, add a `CNAME` record pointing to `<project>.pages.dev`.

### 2. Cockpit Web App (`apps/cockpit`)

Deploy Cockpit as a second Cloudflare Pages project (or subdomain like `app.yourdomain.com`):
- **Build command**: `pnpm --filter @crux/cockpit build`
- **Build output directory**: `apps/cockpit/dist`
- **Environment variables**:
  - `VITE_API_MODE=live`
- SPA routing rules (`_redirects` and `_headers`) are pre-configured in `apps/cockpit/public/`.

### 3. Backend API (`apps/server`)

Deploy the Hono + Socket.IO server to any container platform supporting WebSockets (e.g., Railway, Fly.io, Render, AWS ECS, or a VPS):
- Set production environment variables:
  ```env
  NODE_ENV=production
  PORT=4000
  DATABASE_URL=postgresql://user:password@your-db-host:5432/crux_db
  REDIS_URL=redis://your-redis-host:6379
  JWT_SECRET=your_super_secret_production_jwt_key_at_least_32_chars!
  COOKIE_SECRET=your_super_secret_cookie_key_at_least_32_chars!
  CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
  PRIMARY_WEBHOOK_SECRET=whsec_your_primary_webhook_secret_here
  ```
- Point `api.yourdomain.com` to your backend instance via a Cloudflare DNS `CNAME` record.

---

## Verification & Testing

Crux includes a comprehensive automated test and quality suite:

```bash
# Run backend security & integration tests
pnpm test

# Run TypeScript typecheck across all workspaces
pnpm typecheck

# Run Biome linter & code formatter
pnpm lint

# Build all packages for production
pnpm build
```

---

## License

Crux is licensed under the [MIT License](./LICENSE).
