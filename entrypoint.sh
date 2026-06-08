#!/bin/bash
set -e

PORT="${PORT:-8080}"

# ── Obsidian Headless: vault sync (enabled when OBSIDIAN_VAULT_NAME is set) ──
# The vault is ephemeral on Railway, so the Obsidian Sync cloud is the source of
# truth: each boot pulls the vault down, and agent changes sync back up.
if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  echo "[entrypoint] Obsidian sync enabled for vault: ${OBSIDIAN_VAULT_NAME}"

  ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"

  # Include the E2EE password only if provided (omit for non-encrypted vaults).
  setup_args=(--vault "${OBSIDIAN_VAULT_NAME}" --path /vault)
  if [ -n "${OBSIDIAN_ENCRYPTION_PASSWORD}" ]; then
    setup_args+=(--password "${OBSIDIAN_ENCRYPTION_PASSWORD}")
  fi
  ob sync-setup "${setup_args[@]}"

  # Keep the crew's agent config out of the synced vault (comma-separated folders).
  ob sync-config --path /vault --excluded-folders "${OBSIDIAN_EXCLUDED_FOLDERS:-.opencode}"

  ob sync --path /vault                 # initial pull/merge (blocking)
  ob sync --path /vault --continuous &  # background continuous sync
fi

# ── OpenCode web server ──────────────────────────────────────────────────────
# Runs from /vault (Dockerfile WORKDIR) so it loads .opencode/ and AGENTS.md.
# Binds 0.0.0.0 so Railway's public proxy can reach it; auth via OPENCODE_SERVER_PASSWORD.
exec opencode web --port "${PORT}" --hostname 0.0.0.0
