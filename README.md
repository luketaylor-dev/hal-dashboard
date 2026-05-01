# hal-dashboard

A mobile-friendly Next.js 15 dashboard for managing AI services on `hal` (Ubuntu home AI server, RTX 2080 Ti).

## What it does

- Status + start/stop/restart for 7 services (Ollama, ComfyUI, SillyTavern via systemd; Open WebUI, SearXNG, Speaches, Piper TTS via Docker)
- Live GPU/VRAM stats with per-process breakdown
- Tail journalctl / docker logs over SSE
- Ollama model management (list, pull with progress, delete, see what's loaded, quick chat tester)
- ComfyUI queue depth
- SQLite activity log with VRAM snapshots at action time
- "Panic" reset that stops everything, waits, restarts in dependency order

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + better-sqlite3.

## Architecture

Single Next.js process (port 3737). Route handlers either shell out (`systemctl`, `docker`, `nvidia-smi`, `journalctl`) or proxy to `localhost:11434` (Ollama) / `localhost:8188` (ComfyUI). Runs as the `aidash` system user with scoped passwordless sudo for systemd actions only.

## Network

Plain HTTP on the LAN (UFW-restricted to `192.168.50.0/24`). Off-network access is via WireGuard VPN. No HTTPS, no auth — LAN + VPN is the security boundary.

## Development

```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build (output: standalone)
npm run lint
```

## Deployment

```bash
./scripts/install.sh    # one-time: aidash user, sudoers, systemd unit, ufw
./scripts/deploy.sh     # build + rsync to /home/aidash + restart
```
