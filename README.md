# Mission Control Web

React dashboard for the homelab. Displays inventory, health, and system metrics. Proxies API calls to the backend via nginx.

## Quick Start

```bash
bun install
bun dev    # http://localhost:3001
```

For local dev against the deployed backend, `.env.local` is already configured.

## Scripts

```bash
bun dev          # dev server (port 3001, Vite proxy to backend)
bun build        # production build
bun run lint
bun run type-check
bun test
```

## Stack

- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Data:** SWR, Zustand
- **Charts:** Recharts
- **Routing:** React Router v7

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — inventory, health, metrics |
| `/agents` | Agent run history, live status, approval cards |

## Production Setup

The production image (nginx:alpine) proxies `/api`, `/health`, and `/metrics` directly to `mission-control-backend:3000` via internal K8s DNS — no Cloudflare tunnel needed for local access.

```
Browser → nginx (:80)
  /api/*     → mission-control-backend:3000
  /health*   → mission-control-backend:3000
  /metrics   → mission-control-backend:3000
  /*         → index.html (SPA)
```

## Deployment

Pushed to `docker.toastedbytes.com/mission-control-web` via GitHub Actions on the `develop` branch. ArgoCD Image Updater handles digest bumps automatically.

Local access: `http://192.168.50.60:31367`
