# Full Brain Crew — Railway Deployment Plan

Detailed build notes and operational reference. For a quick overview, env var table, and repo layout,
see [README.md](../README.md).

Built step by step:
- **Step 1 (done):** bare `opencode web` running publicly on Railway.
- **Step 2 (done):** Full Brain Crew installed/updated into `/vault` at boot (agents/skills load).
- **Step 3 (done):** pluggable shell sync layer — current backends are `none`, Obsidian Sync via
  `obsidian-headless`, and Git.
- **Step 4 (done):** Google Workspace (Gmail/Calendar) via the `gws` CLI + injected OAuth credentials.
- **Later (optional):** private access via Tailscale.

---

## How it works

**Build (`Dockerfile`)** — `node:22-trixie-slim` base (Debian 13, glibc 2.41 — the `gws` binary needs
GLIBC ≥ 2.39, which Bookworm's 2.36 lacks); installs `git`, `jq`, `gawk`, `ca-certificates`,
`libsecret-1-0`; `npm i -g opencode-ai obsidian-headless @googleworkspace/cli`; clones the crew into
`/opt/my-brain-is-full-crew` as a bundled fallback; copies runtime scripts from `scripts/` into the image.
Runs from `/vault` by default so opencode resolves the crew config. The crew source is configurable with
`CREW_REPO` and `CREW_REF`; leave `CREW_REF=main` for latest-on-boot or pin it to a tag/commit for
reproducible boots.

**Boot (`scripts/entrypoint.sh`)**, in order:
1. **Sync backend selection:** `SYNC_BACKEND` selects `none`, `obsidian`, or `git`. If unset,
   `OBSIDIAN_VAULT_NAME` still selects `obsidian` for backwards compatibility; otherwise `none` is used.
   `WORKSPACE_PATH` defaults to `/vault`.
2. **Sync prepare/start:** the selected module runs `sync_prepare "$WORKSPACE_PATH"`, then
   `sync_start "$WORKSPACE_PATH"`. Sync failures are **non-fatal** by default; set `SYNC_REQUIRED=true` to
   fail startup when sync is unavailable.
3. **Obsidian backend details:** `ob login` (retried with backoff to ride out Obsidian's transient
   "Server overloaded") → `sync-setup` (with E2EE `--password` if provided) → exclude `.opencode` and `.git`
   → initial `sync` → background `sync --continuous`.
4. **Git backend details:** clone or update `GIT_REMOTE_URL` on `GIT_BRANCH` before OpenCode starts. A
   background loop periodically commits local changes, fetches, rebases onto `origin/$GIT_BRANCH`, and pushes.
   HTTPS token auth uses `GIT_ASKPASS`, so the token is not written into `.git/config`.
5. **Full Brain Crew install/update:** clone `CREW_REPO` at `CREW_REF` into `/tmp` and run
   `launchme.sh --platform opencode --target "$WORKSPACE_PATH"`, feeding the reinstall confirmation
   non-interactively. If the runtime clone fails, fall back to the bundled `/opt/my-brain-is-full-crew`
   source. The upstream installer overwrites crew-owned core files but preserves vault notes and custom agents.
6. **gws credentials** (if `GWS_CREDENTIALS_JSON` set): write the JSON to `~/.config/gws/credentials.json`
   and export `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` so crew agents shelling out to `gws` are authed.
7. **OpenCode project detection:** initialize `$WORKSPACE_PATH/.git` if needed so OpenCode treats the
   workspace as the active project/worktree instead of the global `/` project.
8. **`opencode web`** on `0.0.0.0:$PORT`, protected by `OPENCODE_SERVER_PASSWORD`.

**Why ephemeral `/vault` can be fine:** with a real sync backend on, the remote provider is the source of
truth. With `SYNC_BACKEND=obsidian`, each boot pulls the cloud vault down and agent changes sync back up. With
`SYNC_BACKEND=git`, each boot clones/pulls the Git remote and the background loop commits/pushes changes. With
`SYNC_BACKEND=none`, Railway redeploys remain ephemeral unless a volume or other persistence is added.

---

## Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Public `*.up.railway.app` domain |
| Health Check Path | **Blank** | Password-protected `/` returns 401 (no healthcheck, codified in `railway.json`) |

Environment variables: see [README.md](../README.md#environment-variables) and [`.env.example`](../.env.example).

---

## Verification

- **Step 1/2 (opencode + crew):** logs should show `Full Brain Crew install/update complete`; open the URL,
  log in, and confirm the crew's agents/skills appear in the UI.
- **Sync disabled:** leave `SYNC_BACKEND` and `OBSIDIAN_VAULT_NAME` unset, or set `SYNC_BACKEND=none`; logs
  should show the `none` backend and no Obsidian login attempt.
- **Step 3 (Obsidian):** create the vault in Obsidian Sync first; set either `SYNC_BACKEND=obsidian` plus the
  `OBSIDIAN_*` vars, or rely on legacy auto-selection by setting `OBSIDIAN_VAULT_NAME`; on redeploy the log
  should show `ob login` → `sync-setup` → `sync` with no prompt. Confirm real notes appear in `/vault`, agent
  edits show in local Obsidian, and `.opencode/` plus `.git/` did **not** sync up into your vault.
- **Step 3 (Git):** create a Git repo first; set `SYNC_BACKEND=git`, `GIT_REMOTE_URL`, `GIT_TOKEN`,
  `GIT_BRANCH`, and author identity. Logs should show the Git backend cloning/updating the workspace and
  starting the background sync loop. Confirm workspace edits commit and push after the sync interval.
- **OpenCode project:** the log should show the workspace was initialized as a git worktree on first boot. In
  the UI, the recent/opened project should show `/vault`, not `/` when using the default path.
- **Step 4 (Google):** after onboarding (below), the log shows `gws credentials materialized`; ask the crew
  to read your calendar.

---

## Git sync onboarding

Use Git sync when you want the workspace persisted to a GitHub/GitLab-style repository instead of Obsidian
Sync.

1. Create a private repository for the workspace.
2. Create an HTTPS token with read/write access to that repository's contents.
3. Set `SYNC_BACKEND=git`.
4. Set `GIT_REMOTE_URL` to a token-free HTTPS URL, for example `https://github.com/owner/repo.git`.
5. Store `GIT_TOKEN` as a Railway secret.
6. Set `GIT_BRANCH`, `GIT_AUTHOR_NAME`, and `GIT_AUTHOR_EMAIL`.
7. Deploy and confirm logs show the Git backend cloning/updating the workspace and starting the sync loop.

The Git backend uses `GIT_ASKPASS` for token auth, so the token is not written into `.git/config`. If you do
not want crew runtime files committed to the repo, add these entries to the workspace repo's `.gitignore`:

```gitignore
.opencode/
AGENTS.md
Meta/scripts/
opencode.json
```

---

## Step 4 — Google Workspace onboarding (current Google Auth Platform UI)

The crew's Postman agent shells out to `gws` for Gmail/Calendar. `gws` needs an interactive OAuth flow it
can't do headlessly, so we **bootstrap auth locally and inject the result** as a Railway secret. We use the
credentials-file approach because the exported file carries a long-lived **refresh token** (vs.
`GOOGLE_WORKSPACE_CLI_TOKEN`, a ~1h access token); a service account can't reach a personal gmail.com account.

1. **Google Cloud Console** → create/select a project.
2. **APIs & Services → Library** → enable **Google Calendar API** (and **Gmail API** if you want email).
3. **Google Auth Platform** (Menu → APIs & Services → OAuth consent screen redirects here). First time,
   click **Get started**: set **App name** + **user support email** (Branding), **Audience → External**,
   **Contact email**, agree, Create.
4. **Data Access** tab → **Add or remove scopes** → add the Calendar (and Gmail) scopes → Update/Save.
5. **Audience** tab → **Publish app** → status becomes **In production** (avoids the 7-day refresh-token
   expiry of "Testing").
6. **Clients** tab → **Create client** → Application type **Desktop app** → copy the **Client ID + Secret**.
7. **Locally** (machine with a browser): `npm i -g @googleworkspace/cli` → `gws auth setup` (paste
   ID/secret) → `gws auth login` (browser consent; click through the unverified-app warning) →
   `gws auth export --unmasked > credentials.json`.
8. **Railway**: add secret var `GWS_CREDENTIALS_JSON` = the full contents of `credentials.json`; redeploy.

**Token expiry:** publishing to production (step 5) removes the only scheduled expiry. After that,
re-bootstrap is only needed if you revoke access, go unused for 6 months, or change your Google password
while Gmail scopes are granted. Request only the scopes you need.

---

## Known caveats

- **Boot-time crew updates are live dependencies.** Leaving `CREW_REF=main` means every boot can pick up
  upstream crew changes. Pin `CREW_REF` to a tag/commit when you need reproducible deploys.
- **Crew files can sync to Obsidian.** `.opencode` and `.git` are excluded before the first sync, but
  `AGENTS.md` and `Meta/scripts` are regular vault files and may sync. That is useful for latest crew state,
  but can create visible crew files in the vault.
- **Crew files can sync to Git.** The Git backend commits workspace changes by default, including `.opencode/`,
  `AGENTS.md`, `Meta/scripts/`, and `opencode.json`. Add repo `.gitignore` entries if you do not want these
  files in your notes repo.
- **Git conflicts are manual.** The backend aborts a failed rebase and logs an error; it does not auto-resolve
  conflicts.
- **No process supervisor.** `ob sync --continuous` runs backgrounded; if it dies the container stays up but
  silently stops syncing.
- **Concurrent writes.** Agents writing while continuous sync pulls remote edits can create Obsidian
  sync-conflict files — inherent to bidirectional sync.
- **MFA assumption.** Obsidian login is automated for an account with no 2FA; enabling 2FA later breaks boots.
- **Future sync providers.** Drive-style providers are not implemented yet; the shell module seam is ready for
  adding them later.
- **gws build risk.** If `npm i -g @googleworkspace/cli` ever fails building a native keyring module,
  add `build-essential` + `libsecret-1-dev` to the Dockerfile (`libsecret-1-0` runtime lib is already there).

---

## Later (optional) — private access via Tailscale

Put the UI behind Tailscale instead of public networking:
- Install Tailscale; run `tailscaled --tun=userspace-networking` (required on Railway — no TUN device).
- `tailscale up` with a **reusable + ephemeral** auth key (ephemeral auto-reaps the node on redeploy, so
  no stale devices and the hostname stays stable).
- `tailscale serve --bg --https=443 http://127.0.0.1:$PORT` (the `--bg` is required or it blocks boot).
- Enable **MagicDNS + HTTPS Certificates** in the tailnet admin, and **disable Railway public networking**.
