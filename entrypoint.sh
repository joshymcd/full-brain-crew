#!/bin/bash
set -e

PORT="${PORT:-8080}"

# ── Obsidian Headless: OPTIONAL vault sync ───────────────────────────────────
# Skipped entirely unless OBSIDIAN_VAULT_NAME is set. Leave it unset for a basic
# deploy with an ephemeral vault.
if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  # Account has no MFA — login is fully automated with email + password.
  ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"

  # E2EE vaults need a SEPARATE encryption password, or sync-setup hangs on a prompt.
  ob sync-setup --vault "${OBSIDIAN_VAULT_NAME}" --path /vault \
    --password "${OBSIDIAN_ENCRYPTION_PASSWORD}"

  # Keep agent config out of the synced vault (excluded-folders is a sync-config flag).
  ob sync-config --path /vault --excluded-folders .opencode

  ob sync --path /vault                 # initial pull
  ob sync --continuous --path /vault &  # background continuous sync
fi

# ── OpenCode web server ──────────────────────────────────────────────────────
# Binds 0.0.0.0 so Railway's public proxy can reach it.
# Protected by OPENCODE_SERVER_PASSWORD (and optional OPENCODE_SERVER_USERNAME).
exec opencode web --port "${PORT}" --hostname 0.0.0.0
