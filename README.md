# Full Brain Crew on Railway

Deploy the [Full Brain Crew](https://github.com/gnekt/My-Brain-Is-Full-Crew) — OpenCode agents that
operate on a local workspace — as a password-protected web app on [Railway](https://railway.com),
with pluggable sync backends and optional Google Workspace (Gmail/Calendar) integration.

## What it runs

- **OpenCode web UI** (`opencode web`) — the agent runtime + browser UI, served publicly on Railway and
  protected by a password. Models come from **OpenCode Go / Zen** via `OPENCODE_API_KEY`.
- **Full Brain Crew** — treated as a boot-time dependency: each startup installs/updates crew-owned files in
  `/vault` (`.opencode/`, `AGENTS.md`, `Meta/scripts`) from `CREW_REPO` + `CREW_REF`.
- **Workspace sync** *(optional)* — a selected backend prepares and persists `/vault`. Current backends are
  `none`, `local`, `obsidian`, and `git`; Drive-style backends can be added behind the same shell module
  interface later.
  `/vault` is initialized as a local git worktree at boot so OpenCode treats it as the active project instead
  of falling back to `/`.
- **Google Workspace** *(optional)* — the crew's `gws` CLI for Gmail/Calendar, authenticated via an
  injected OAuth credentials file.

## Architecture

```
Railway Container (node:22-trixie-slim)
├── sync backend       ──syncs──▶  Obsidian Sync / Git remote / local volume / none
├── crew installer     ──updates─▶  /vault/.opencode/ + /vault/AGENTS.md + /vault/Meta/scripts
├── OpenCode web UI (cwd=/vault) ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
└── gws CLI (optional)  ──▶  Gmail / Google Calendar
```

`/vault` is ephemeral on Railway unless a sync backend restores and persists it. With `SYNC_BACKEND=obsidian`,
the Obsidian cloud vault is the source of truth. With `SYNC_BACKEND=git`, a Git remote is the source of truth:
each boot clones/pulls it down, and workspace changes are periodically committed and pushed back up. With
`SYNC_BACKEND=local`, no remote sync runs; persistence is expected from a volume or bind mount.

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
| `VITE_OPENCODE_SERVER_URL` | Webapp | Public/base URL used by the local webapp OpenCode SDK client |
| `OPENCODE_PORT` | Local Docker | Host port mapped to the OpenCode container's fixed port `8080` |
| `WEBAPP_PORT` | Local Docker | Host port mapped to the Vite webapp container's fixed port `3000` |
| `OPENCODE_API_KEY` | **Required to use** | OpenCode Go / Zen API key (auto-detected) |
| `OPENCODE_SERVER_USERNAME` | Optional | Web UI username (defaults to `opencode`) |
| `CREW_REPO` / `CREW_REF` | Optional | Full Brain Crew source and ref installed at boot; defaults to upstream `main` |
| `SYNC_BACKEND` | Optional | Sync backend: `none`, `local`, `obsidian`, or `git`; defaults to `obsidian` when `OBSIDIAN_VAULT_NAME` is set, otherwise `none` |
| `SYNC_REQUIRED` | Optional | Set `true` to fail startup when sync fails; defaults to non-fatal sync failures |
| `WORKSPACE_PATH` | Optional | Local assistant workspace path, defaults to `/vault` |
| `OBSIDIAN_VAULT_NAME` | Obsidian backend | Exact vault name in Obsidian Sync |
| `OBSIDIAN_EMAIL` / `OBSIDIAN_PASSWORD` | With sync | Obsidian account credentials (no MFA) |
| `OBSIDIAN_ENCRYPTION_PASSWORD` | If E2EE | Vault encryption password (separate from account pw) |
| `OBSIDIAN_EXCLUDED_FOLDERS` | Optional | Comma-separated folders excluded from sync (`.opencode` and `.git` are always included) |
| `GIT_REMOTE_URL` | Git backend | Token-free HTTPS Git remote URL, e.g. `https://github.com/owner/repo.git` |
| `GIT_TOKEN` | Git backend | HTTPS token used through `GIT_ASKPASS`; store as a secret |
| `GIT_BRANCH` | Git backend | Branch to clone/pull/push, defaults to `main` |
| `GIT_USERNAME` | Git backend | HTTPS username, defaults to `x-access-token` |
| `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` | Git backend | Commit author identity for workspace commits |
| `GIT_SYNC_INTERVAL_SECONDS` | Git backend | Background sync interval, defaults to `60` |
| `GIT_COMMIT_MESSAGE` | Git backend | Commit message for automatic workspace commits |
| `GWS_CREDENTIALS_JSON` | Enables Google | Contents of a locally-exported `gws` credentials file (secret) |
| `PORT` | — | Auto-injected by Railway — **do not set** |

For local development, keep webapp-only browser env in `webapp/.env` and Docker/OpenCode env in the root `.env`. The webapp only needs `VITE_OPENCODE_SERVER_URL`; username/password are entered in the browser and stored for the session. Docker Compose uses the root `.env`. Container ports stay fixed (`8080` for OpenCode, `3000` for the webapp); `OPENCODE_PORT` and `WEBAPP_PORT` only control host-side port mappings.

## Repo layout

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the image: opencode + obsidian-headless + gws, bundles crew source fallback and runtime scripts |
| `scripts/entrypoint.sh` | Boot orchestration: selected sync backend, crew install/update, gws credentials, then `opencode web` |
| `scripts/lib/` | Runtime helpers for crew install, Google Workspace credentials, and workspace setup |
| `scripts/sync/` | Shell sync modules (`none`, `local`, `obsidian`, `git`) plus shared selection helpers |
| `railway.json` | Railway config-as-code (Dockerfile builder, restart policy, no healthcheck) |
| `.env.example` | Annotated env var declarations |
| `.dockerignore` / `.gitignore` / `.gitattributes` | Build-context trim, secret-safety, LF for `*.sh` |
| `docs/deployment.md` | Detailed build (Steps 1–4), Google Workspace onboarding runbook, caveats |

## Full setup & details

See **[docs/deployment.md](docs/deployment.md)** for the step-by-step build, the Google Workspace
onboarding runbook, known caveats, and the optional Tailscale (private-access) setup.
