# Full Brain Crew — Railway Deployment Plan

Built step by step.
- **Step 1 (done):** bare `opencode web` running publicly on Railway.
- **Step 2 (done):** Full Brain Crew installed into `/vault` (agents/skills load).
- **Step 3 (current):** Obsidian Sync via `obsidian-headless` — `/vault` syncs with your Obsidian cloud.
- **Later (optional):** private access via Tailscale.

`/vault` is ephemeral on Railway, so the **Obsidian Sync cloud is the source of truth**: each boot pulls
the vault down, and changes the agents make sync back up. No volume required.

---

## Architecture

```
Railway Container (node:22-bookworm-slim)
├── obsidian-headless  ──syncs──▶  Obsidian Sync (cloud)  ◀──syncs──  Your local Obsidian
├── OpenCode web UI (cwd=/vault) ──serves──▶  https://<service>.up.railway.app  (public, password-protected)
└── Full Brain Crew  ──▶  /vault/.opencode/ (agents, skills) + /vault/AGENTS.md (dispatcher)
```

The crew is baked into `/vault` at build time. On boot, `obsidian-headless` pulls the cloud vault into
`/vault` and runs continuous sync. `.opencode/` is excluded from sync so the agent config stays local
and never clutters your Obsidian.

---

## Files

**`Dockerfile`** — installs `git`, `jq`, `gawk`, `ca-certificates`; `npm i -g opencode-ai obsidian-headless`;
clones the crew and runs `launchme.sh --platform opencode --target /vault`. Runs from `/vault`.

**`entrypoint.sh`**

```bash
#!/bin/bash
set -e
PORT="${PORT:-8080}"

if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"
  setup_args=(--vault "${OBSIDIAN_VAULT_NAME}" --path /vault)
  [ -n "${OBSIDIAN_ENCRYPTION_PASSWORD}" ] && setup_args+=(--password "${OBSIDIAN_ENCRYPTION_PASSWORD}")
  ob sync-setup "${setup_args[@]}"
  ob sync-config --path /vault --excluded-folders "${OBSIDIAN_EXCLUDED_FOLDERS:-.opencode}"
  ob sync --path /vault                 # initial pull/merge (blocking)
  ob sync --path /vault --continuous &  # background continuous sync
fi

exec opencode web --port "${PORT}" --hostname 0.0.0.0
```

**`railway.json`** — Dockerfile builder + deploy settings (restart policy, no healthcheck).
**`.env.example`** — declares required + Obsidian env vars (also feeds Railway's "Suggested Variables").
**`.dockerignore`** / **`.gitignore`** / **`.gitattributes`** — context trim, secret-safety, LF for `*.sh`.

---

## Railway environment variables

| Variable | Required | Notes |
|---|---|---|
| `OPENCODE_SERVER_PASSWORD` | **Yes** | Protects the public web UI |
| `OPENCODE_API_KEY` | For use | OpenCode Go / Zen key; auto-detected |
| `OPENCODE_SERVER_USERNAME` | Optional | Web UI username; defaults to `opencode` |
| `OBSIDIAN_VAULT_NAME` | For sync | **Setting this turns sync on.** Exact vault name in Obsidian Sync |
| `OBSIDIAN_EMAIL` | For sync | Obsidian account email |
| `OBSIDIAN_PASSWORD` | For sync | Obsidian account password (no MFA on the account) |
| `OBSIDIAN_ENCRYPTION_PASSWORD` | If E2EE | Vault E2EE password (separate from account pw); omit for non-encrypted vaults |
| `OBSIDIAN_EXCLUDED_FOLDERS` | Optional | Comma-separated folders excluded from sync; defaults to `.opencode` |
| `PORT` | Auto-injected | Railway injects this — **do not set** |

## Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Public `*.up.railway.app` domain |
| Health Check Path | **Blank** | Password-protected `/` returns 401 (no healthcheck, codified in `railway.json`) |

---

## How to confirm Step 3

1. Create the vault in Obsidian Sync first (from the desktop app), note its exact name + E2EE password.
2. Set the `OBSIDIAN_*` vars in Railway, then redeploy.
3. Watch the deploy log: `ob login` → `ob sync-setup` → `ob sync` should complete without prompting; a bad
   credential / vault name will fail here (`set -e` stops the boot — that's the signal).
4. In the web UI, confirm your real notes are present in `/vault`, and that edits the agents make show up
   in your local Obsidian after a moment.
5. Confirm `.opencode/` did **not** get pushed into your local Obsidian vault.

---

## Known caveats

- **First-sync merge** of a populated `/vault` (baked-in crew) against the remote vault is undocumented
  upstream; excluding `.opencode` before the first sync avoids pushing agent config. `AGENTS.md` is a
  single file (not a folder) so `--excluded-folders` won't catch it — it may sync up; add more excludes
  via `OBSIDIAN_EXCLUDED_FOLDERS` if the crew folders clutter your vault.
- **No supervisor.** `ob sync --continuous` runs backgrounded; if it dies the container stays up but
  silently stops syncing.
- **Concurrent writes.** Agents writing while continuous sync pulls remote edits can create Obsidian
  sync-conflict files. Inherent to bidirectional sync.
- **MFA assumption.** Login is automated for an account with no 2FA; enabling 2FA later breaks boots.

---

## Later (optional)

- **Private access.** Put it behind Tailscale (userspace `tailscaled` + `tailscale serve --bg`, reusable
  + ephemeral key) and disable Railway public networking.
