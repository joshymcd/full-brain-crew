# Full Brain Crew — Railway Deployment Plan

Built step by step. **Step 1 (current): get a bare `opencode web` running publicly on Railway** and
confirm it loads. Later steps add the crew repo, persistence, and private access.

---

## Step 1 — Basic `opencode web` (current)

### Architecture

```
Railway Container (node:22-bookworm-slim)
└── OpenCode web UI  ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
```

No Tailscale, no crew repo, no Obsidian sync. Just the OpenCode web server, exposed via Railway's public
networking and protected by `OPENCODE_SERVER_PASSWORD`.

### Files

**`Dockerfile`**

```dockerfile
FROM node:22-bookworm-slim

# ca-certificates so the opencode-ai postinstall can fetch its platform binary over TLS.
RUN apt-get update && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# Empty working directory for opencode to operate in.
RUN mkdir -p /workspace
WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

**`entrypoint.sh`**

```bash
#!/bin/bash
set -e

PORT="${PORT:-8080}"

# Binds 0.0.0.0 so Railway's public proxy can reach it.
exec opencode web --port "${PORT}" --hostname 0.0.0.0
```

**`.dockerignore`** — `.git`, `node_modules`, `*.md`
**`.gitattributes`** — forces `*.sh` to LF so scripts run in the Linux container when committed from Windows.

### Railway environment variables

| Variable | Required | Notes |
|---|---|---|
| `OPENCODE_SERVER_PASSWORD` | **Yes** | Protects the public web UI — without it the UI is unsecured |
| `OPENCODE_API_KEY` | For use | OpenCode Go / Zen API key (from the OpenCode Zen console). Picked up automatically — no `opencode auth login` needed. The web server starts without it, but you can't run a model |
| `OPENCODE_SERVER_USERNAME` | Optional | Login username; defaults to `opencode` |
| `PORT` | Auto-injected | Railway injects this — **do not set** |

Model selection: with `OPENCODE_API_KEY` set, pick an `opencode-go/<model-id>` model in the web UI
(e.g. `opencode-go/kimi-k2.6`). To pin a default instead, add an `opencode.json` with
`"model": "opencode-go/<model-id>"`.

### Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Generates the public `*.up.railway.app` domain |
| Health Check Path | **Disabled / blank** | With a password set, `/` returns 401 and would fail an HTTP health check |

### How to confirm it works

1. Push to `main`; Railway builds the Dockerfile and deploys.
2. Find the public URL under the service's **Settings → Networking**.
3. Open it; you should be prompted for `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`, then see
   the OpenCode web UI.
4. If the page loads blank, see the note on anomalyco/opencode issue #6557 — likely needs an
   `opencode-ai` version pin in the Dockerfile.

---

## Later steps (not yet implemented)

- **Step 2 — Add the crew.** Clone `gnekt/My-Brain-Is-Full-Crew` (pinned to a commit) and run
  `scripts/launchme.sh --platform opencode --target /workspace` at build time so the agents/skills load.
- **Step 3 — Persistence.** Enable Obsidian Sync via `obsidian-headless` (account email/password + E2EE
  password + vault name) for bidirectional sync with local Obsidian, or mount a Railway Volume.
- **Step 4 — Private access (optional).** Put it behind Tailscale (userspace `tailscaled` +
  `tailscale serve --bg`) with a reusable + ephemeral key, and disable Railway public networking.
