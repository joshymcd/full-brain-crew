# Full Brain Crew on Railway

Deploy the [Full Brain Crew](https://github.com/gnekt/My-Brain-Is-Full-Crew) — OpenCode agents that
operate on your Obsidian vault — as a password-protected web app on [Railway](https://railway.com),
with optional Obsidian Sync and Google Workspace (Gmail/Calendar) integration.

## What it runs

- **OpenCode web UI** (`opencode web`) — the agent runtime + browser UI, served publicly on Railway and
  protected by a password. Models come from **OpenCode Go / Zen** via `OPENCODE_API_KEY`.
- **Full Brain Crew** — treated as a boot-time dependency: each startup installs/updates crew-owned
  files in `/vault` (`.opencode/`, `AGENTS.md`, `Meta/scripts`) from `CREW_REPO` + `CREW_REF`.
- **Obsidian Sync** *(optional)* — `obsidian-headless` keeps `/vault` in sync with your Obsidian cloud,
  which is also how the (ephemeral) vault persists across redeploys. `/vault` is initialized as a local git
  worktree at boot so OpenCode treats it as the active project instead of falling back to `/`.
- **Google Workspace** *(optional)* — the crew's `gws` CLI for Gmail/Calendar, authenticated via an
  injected OAuth credentials file.

## Architecture

```
Railway Container (node:22-trixie-slim)
├── obsidian-headless  ──syncs──▶  Obsidian Sync (cloud)  ◀──syncs──  Your local Obsidian
├── OpenCode web UI (cwd=/vault) ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
├── Full Brain Crew  ──▶  /vault/.opencode/ (agents, skills) + /vault/AGENTS.md (dispatcher)
└── gws CLI (optional)  ──▶  Gmail / Google Calendar
```

`/vault` is ephemeral. With Obsidian Sync enabled, the **cloud vault is the source of truth**: each boot
pulls it down, and agent changes sync back up. `.opencode/` and `.git/` are excluded from sync so agent
config and local project-detection metadata never clutter your notes.

## Quick start

1. Connect this repo to a Railway service — it auto-detects the Dockerfile via [`railway.json`](railway.json).
2. Set the environment variables below (minimum: `OPENCODE_SERVER_PASSWORD` + `OPENCODE_API_KEY`).
3. Service settings: **Public Networking → Enabled**, **Health Check Path → blank** (a password-protected
   `/` returns 401, which would fail an HTTP health check).
4. Deploy, open the `*.up.railway.app` URL, and log in.

## Environment variables

Set these in the Railway dashboard (**Settings → Variables**) — config-as-code can't hold secrets.
See [`.env.example`](.env.example) for the annotated list.

| Variable | When | Purpose |
|---|---|---|
| `OPENCODE_SERVER_PASSWORD` | **Required** | Password for the public web UI |
| `OPENCODE_API_KEY` | **Required to use** | OpenCode Go / Zen API key (auto-detected) |
| `OPENCODE_SERVER_USERNAME` | Optional | Web UI username (defaults to `opencode`) |
| `CREW_REPO` / `CREW_REF` | Optional | Full Brain Crew source and ref installed at boot; defaults to upstream `main` |
| `OBSIDIAN_VAULT_NAME` | Enables sync | Exact vault name in Obsidian Sync — **the on-switch** |
| `OBSIDIAN_EMAIL` / `OBSIDIAN_PASSWORD` | With sync | Obsidian account credentials (no MFA) |
| `OBSIDIAN_ENCRYPTION_PASSWORD` | If E2EE | Vault encryption password (separate from account pw) |
| `OBSIDIAN_EXCLUDED_FOLDERS` | Optional | Comma-separated folders excluded from sync (`.opencode` and `.git` are always included) |
| `GWS_CREDENTIALS_JSON` | Enables Google | Contents of a locally-exported `gws` credentials file (secret) |
| `PORT` | — | Auto-injected by Railway — **do not set** |

## Repo layout

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the image: opencode + obsidian-headless + gws, bundles crew source fallback |
| `entrypoint.sh` | Boot logic: Obsidian sync (gated), crew install/update, gws credentials, then `opencode web` |
| `railway.json` | Railway config-as-code (Dockerfile builder, restart policy, no healthcheck) |
| `.env.example` | Annotated env var declarations |
| `.dockerignore` / `.gitignore` / `.gitattributes` | Build-context trim, secret-safety, LF for `*.sh` |
| `DEPLOYMENT_PLAN.md` | Detailed build (Steps 1–4), Google Workspace onboarding runbook, caveats |

## Full setup & details

See **[DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md)** for the step-by-step build, the Google Workspace
onboarding runbook, known caveats, and the optional Tailscale (private-access) setup.
