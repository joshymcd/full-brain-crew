# Full Brain Crew — Railway Deployment Plan

Detailed build notes and operational reference. For a quick overview, env var table, and repo layout,
see [README.md](README.md).

Built step by step:
- **Step 1 (done):** bare `opencode web` running publicly on Railway.
- **Step 2 (done):** Full Brain Crew installed into `/vault` (agents/skills load).
- **Step 3 (done):** Obsidian Sync via `obsidian-headless` — `/vault` syncs with your Obsidian cloud.
- **Step 4 (done):** Google Workspace (Gmail/Calendar) via the `gws` CLI + injected OAuth credentials.
- **Later (optional):** private access via Tailscale.

---

## How it works

**Build (`Dockerfile`)** — `node:22-bookworm-slim` base; installs `git`, `jq`, `gawk`, `ca-certificates`,
`libsecret-1-0`; `npm i -g opencode-ai obsidian-headless @googleworkspace/cli`; clones the crew and runs
`launchme.sh --platform opencode --target /vault` (generates `.opencode/` + `AGENTS.md`). Runs from `/vault`
so opencode resolves the crew config. The crew ref is pinnable via `--build-arg CREW_REF=<sha>`.

**Boot (`entrypoint.sh`)**, in order:
1. **Obsidian sync** (if `OBSIDIAN_VAULT_NAME` set): `ob login` (retried with backoff to ride out
   Obsidian's transient "Server overloaded") → `sync-setup` (with E2EE `--password` if provided) →
   exclude `.opencode` → initial `sync` → background `sync --continuous`. **Non-fatal**: on failure it
   warns and continues, so a sync misconfig doesn't crash-loop the container (which only hammers
   Obsidian's API harder).
2. **gws credentials** (if `GWS_CREDENTIALS_JSON` set): write the JSON to `~/.config/gws/credentials.json`
   and export `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` so crew agents shelling out to `gws` are authed.
3. **`opencode web`** on `0.0.0.0:$PORT`, protected by `OPENCODE_SERVER_PASSWORD`.

**Why ephemeral `/vault` is fine:** with Obsidian Sync on, the cloud vault is the source of truth — each
boot pulls it down and agent changes sync back up. No Railway volume required.

---

## Railway service settings

| Setting | Value | Reason |
|---|---|---|
| Public Networking | **Enabled** | Public `*.up.railway.app` domain |
| Health Check Path | **Blank** | Password-protected `/` returns 401 (no healthcheck, codified in `railway.json`) |

Environment variables: see [README.md](README.md#environment-variables) and [`.env.example`](.env.example).

---

## Verification

- **Step 1/2 (opencode + crew):** open the URL, log in, confirm the crew's agents/skills appear in the UI.
- **Step 3 (Obsidian):** create the vault in Obsidian Sync first; set the `OBSIDIAN_*` vars; on redeploy the
  log should show `ob login` → `sync-setup` → `sync` with no prompt. Confirm real notes appear in `/vault`,
  agent edits show in local Obsidian, and `.opencode/` did **not** sync up into your vault.
- **Step 4 (Google):** after onboarding (below), the log shows `gws credentials materialized`; ask the crew
  to read your calendar.

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

- **First-sync merge** of a populated `/vault` (baked-in crew) against the remote vault is undocumented
  upstream; excluding `.opencode` before the first sync avoids pushing agent config. `AGENTS.md` is a single
  file (not a folder) so `--excluded-folders` won't catch it — it may sync up; add more excludes via
  `OBSIDIAN_EXCLUDED_FOLDERS` if crew files clutter your vault.
- **No process supervisor.** `ob sync --continuous` runs backgrounded; if it dies the container stays up but
  silently stops syncing.
- **Concurrent writes.** Agents writing while continuous sync pulls remote edits can create Obsidian
  sync-conflict files — inherent to bidirectional sync.
- **MFA assumption.** Obsidian login is automated for an account with no 2FA; enabling 2FA later breaks boots.
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
