# Full Brain Crew — Railway Deployment Plan

Built step by step.
- **Step 1 (done):** bare `opencode web` running publicly on Railway.
- **Step 2 (current):** install the Full Brain Crew into `/vault` so the agents/skills load.
- **Later:** hook up a real vault (Obsidian Sync / volume) and optionally private access.

The vault lives at `/vault`. For now it's baked into the image and **ephemeral** — wiring up real
vault contents/sync is a later step.

---

## Architecture

```
Railway Container (node:22-bookworm-slim)
├── OpenCode web UI (cwd=/vault) ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
└── Full Brain Crew  ──▶  /vault/.opencode/ (agents, skills) + /vault/AGENTS.md (dispatcher)
```

The crew is installed at **build time** via `launchme.sh --platform opencode --target /vault`.
`opencode web` runs from `/vault`, so it resolves `.opencode/` and `AGENTS.md` automatically.

---

## Files

**`Dockerfile`**

```dockerfile
FROM node:22-bookworm-slim

# git: clone the crew repo.  jq + gawk: required by the opencode config-merge adapter.
# ca-certificates: TLS for git https and the opencode-ai npm postinstall binary fetch.
RUN apt-get update && apt-get install -y git jq gawk ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# Install the Full Brain Crew into the vault (.opencode/, AGENTS.md, folder structure).
# --platform + --target make launchme.sh non-interactive.
ARG CREW_REF=main
RUN mkdir -p /vault
WORKDIR /vault
RUN git clone https://github.com/gnekt/My-Brain-Is-Full-Crew.git \
    && cd My-Brain-Is-Full-Crew \
    && git checkout "${CREW_REF}" \
    && bash scripts/launchme.sh --platform opencode --target /vault

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /vault
ENTRYPOINT ["/entrypoint.sh"]
```

**`entrypoint.sh`**

```bash
#!/bin/bash
set -e
PORT="${PORT:-8080}"
# Binds 0.0.0.0 so Railway's public proxy can reach it. Runs from /vault (WORKDIR).
exec opencode web --port "${PORT}" --hostname 0.0.0.0
```

**`railway.json`** — config-as-code: Dockerfile builder + deploy settings (restart policy, no healthcheck).
**`.env.example`** — declares the required env vars (also feeds Railway's "Suggested Variables").
**`.dockerignore`** / **`.gitignore`** / **`.gitattributes`** — context trim, secret-safety, LF for `*.sh`.

### Install-time dependencies (why they're in the image)

- `git` — clones the crew repo.
- `jq` + `gawk` — `adapters/opencode/config-merge.sh` uses them to merge the opencode config JSON.
- No python / node / npm needed by the installer itself.

---

## Railway environment variables

| Variable | Required | Notes |
|---|---|---|
| `OPENCODE_SERVER_PASSWORD` | **Yes** | Protects the public web UI |
| `OPENCODE_API_KEY` | For use | OpenCode Go / Zen key; auto-detected, no `opencode auth login` |
| `OPENCODE_SERVER_USERNAME` | Optional | Login username; defaults to `opencode` |
| `PORT` | Auto-injected | Railway injects this — **do not set** |

Set real values in the Railway dashboard (**Settings → Variables**) or `railway variables --set`;
config-as-code can't hold secrets. Model selection: pick an `opencode-go/<model-id>` in the web UI.

## Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Public `*.up.railway.app` domain |
| Health Check Path | **Blank** | A password-protected `/` returns 401 (codified in `railway.json` — no healthcheck) |

---

## How to confirm Step 2

1. Push to `main`; Railway rebuilds (the new layers install git/jq/gawk, clone the crew, run `launchme.sh`).
2. Watch the build log: the `launchme.sh` step should report installing `.opencode/` + `AGENTS.md` to
   `/vault` and **not** hang on a prompt. If it cancels/aborts, that's the overwrite-prompt path — flag it.
3. Open the public URL, log in, and confirm the crew's agents/skills are available in the OpenCode UI.

---

## Later steps (not yet implemented)

- **Step 3 — Real vault + persistence.** Enable Obsidian Sync via `obsidian-headless` (account creds +
  E2EE password + vault name) for bidirectional sync, or mount a Railway Volume at `/vault` (note: a
  volume shadows the image's baked `/vault`, so the clone + `launchme.sh` would move into the entrypoint,
  guarded to run only on first boot).
- **Step 4 — Private access (optional).** Put it behind Tailscale (userspace `tailscaled` +
  `tailscale serve --bg`, reusable + ephemeral key) and disable Railway public networking.
