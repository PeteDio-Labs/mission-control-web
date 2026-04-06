# Mission Control Web

Next.js dashboard for PeteDio homelab infrastructure. Provides a browser-based view of K8s workloads, Proxmox VMs, ArgoCD app health, and Pete Bot activity. Backed by Mission Control Backend.

## Quick Start

```bash
bun install
cp .env.example .env.local  # configure NEXT_PUBLIC_API_URL
bun dev                      # http://localhost:3001
```

## Scripts

```bash
bun dev          # dev server (port 3001, hot reload)
bun build        # production build
bun start        # run production build
bun test         # run tests
bun run typecheck
bun run lint
```

## Stack

- **Runtime:** Bun
- **Framework:** Next.js 14 (App Router), TypeScript
- **UI:** Tailwind CSS, shadcn/ui
- **State:** Zustand
- **HTTP:** Native fetch
- **Testing:** Vitest

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Mission Control Backend URL |

## Deployment

Pushed to `docker.toastedbytes.com/mission-control-web` via GitHub Actions on push to `main`. Production build served by Nginx container. ArgoCD Image Updater handles digest pinning. K8s manifests live in `infrastructure/kubernetes/mission-control`. Deployed in `mission-control` (dev) and `mission-control-prod` (prod) namespaces.
