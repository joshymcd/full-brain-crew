# Full Brain Crew — Railway Deployment Plan (basic / public)

## Architecture

```
Railway Container (node:22-bookworm-slim)
├── OpenCode web UI  ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
├── Crew agents (.opencode/)  ──operate on──▶  /vault
└── obsidian-headless (OPTIONAL) ──syncs──▶  Obsidian Sync (cloud)
```

This is the **basic** setup: OpenCode web is exposed publicly via Railway's own networking and protected
by `OPENCODE_SERVER_PASSWORD`. No Tailscale. Obsidian vault sync is **optional** and off by default —
without it the vault is ephemeral (just the cloned crew repo plus whatever agents create during the
container's lifetime).

> Hardening for later (phase 2): put it behind Tailscale (tailnet-only, no public exposure) and/or
> enable persistent Obsidian Sync. See "Future" below.

---

## Files

### 1. `Dockerfile`

```dockerfile
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y curl ca-certificates git bash \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# Obsidian Headless (optional vault sync) — requires Node 22+
RUN npm install -g obsidian-headless

# Clone crew repo into vault and run installer.
# Pin to a specific commit for reproducible builds (override at build time with --build-arg CREW_REF=<sha>).
ARG CREW_REF=main
RUN mkdir -p /vault
WORKDIR /vault
RUN git clone https://github.com/gnekt/My-Brain-Is-Full-Crew.git \
    && cd My-Brain-Is-Full-Crew \
    && git checkout "${CREW_REF}"
WORKDIR /vault/My-Brain-Is-Full-Crew
RUN bash scripts/launchme.sh --platform opencode --target /vault

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /vault
ENTRYPOINT ["/entrypoint.sh"]
```

### 2. `entrypoint.sh`

```bash
#!/bin/bash
set -e

PORT="${PORT:-8080}"

# ── Obsidian Headless: OPTIONAL vault sync ───────────────────────────────────
# Skipped entirely unless OBSIDIAN_VAULT_NAME is set.
if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"
  ob sync-setup --vault "${OBSIDIAN_VAULT_NAME}" --path /vault \
    --password "${OBSIDIAN_ENCRYPTION_PASSWORD}"
  ob sync-config --path /vault --excluded-folders .opencode
  ob sync --path /vault                 # initial pull
  ob sync --continuous --path /vault &  # background continuous sync
fi

# ── OpenCode web server ──────────────────────────────────────────────────────
# Binds 0.0.0.0 so Railway's public proxy can reach it.
# Protected by OPENCODE_SERVER_PASSWORD (and optional OPENCODE_SERVER_USERNAME).
exec opencode web --port "${PORT}" --hostname 0.0.0.0
```

### 3. `.dockerignore`

```dockerignore
.git
node_modules
*.md
```

### 4. `.gitattributes`

Forces shell scripts to LF so they run in the Linux container even when committed from Windows.

---

## Railway environment variables

| Variable | Required | Purpose | Example |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Required** | LLM provider key (or `OPENAI_API_KEY` etc.) | `sk-ant-...` |
| `OPENCODE_SERVER_PASSWORD` | **Required** | Password for the public web UI — set this or the UI is unsecured | `your-secure-password` |
| `OPENCODE_SERVER_USERNAME` | Optional | Username for the web UI (defaults to `opencode`) | `josh` |
| `OBSIDIAN_VAULT_NAME` | Optional | Set to enable vault sync (exact name in Obsidian Sync) | `My Vault` |
| `OBSIDIAN_EMAIL` | Optional† | Obsidian account email | `you@example.com` |
| `OBSIDIAN_PASSWORD` | Optional† | Obsidian account password | `your-password` |
| `OBSIDIAN_ENCRYPTION_PASSWORD` | Optional† | Obsidian Sync E2EE password (separate from account pw) | `your-e2ee-pass` |
| `PORT` | Auto-injected | Railway injects this — **do not set** | `8080` |

*† Required only if you set `OBSIDIAN_VAULT_NAME` to enable sync. Omit all four for a basic ephemeral
deploy.*

---

## Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Generates the public `*.up.railway.app` domain |
| Health Check Path | **Disabled / blank** | With `OPENCODE_SERVER_PASSWORD` set, `/` returns 401 — an HTTP health check would fail-loop |
| Deployment Trigger | Auto (on push) | Or manual via Railway dashboard |

---

## Prerequisites

1. **LLM provider API key** — Anthropic, OpenAI, or any provider OpenCode supports.
2. **Railway project** — create a service from this GitHub repo; Railway auto-detects the Dockerfile.

---

## How you access it

Railway assigns a public domain (visible under the service's **Settings → Networking**):

```
https://<service>.up.railway.app
```

Open it in any browser; the OpenCode web UI prompts for the username/password from
`OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`, then loads the Full Brain Crew agents.

---

## Caveats

- **Public exposure.** The UI is on the public internet, gated only by basic auth. Use a strong
  `OPENCODE_SERVER_PASSWORD`. For anything sensitive, move to the tailnet-only setup (Future, below).
- **Ephemeral vault** (when Obsidian sync is off). Notes the agents create do NOT persist across
  redeploys. Enable Obsidian sync, or add a Railway Volume, for persistence.
- **No process supervisor.** If the optional background `ob sync --continuous` dies, the container stays
  up but stops syncing.

---

## Future (phase 2)

- **Tailnet-only access** — reintroduce Tailscale (userspace `tailscaled` + `tailscale serve --bg`) and
  disable Railway public networking, so the UI is reachable only from your devices. Use a reusable +
  ephemeral auth key.
- **Persistent vault** — enable Obsidian Sync (set the `OBSIDIAN_*` vars) for bidirectional sync with
  local Obsidian, or mount a Railway Volume at `/vault` (note: a volume shadows the crew files baked into
  the image, so the clone + `launchme.sh` install would need to move into the entrypoint, guarded to run
  only on first boot).
