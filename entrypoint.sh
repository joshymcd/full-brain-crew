#!/bin/bash
set -e

PORT="${PORT:-8080}"

# Set up Obsidian Sync. Returns non-zero on failure so the caller can continue
# without sync rather than crash-looping the container (which hammers Obsidian's API).
obsidian_sync() {
  echo "[entrypoint] Obsidian sync enabled for vault: ${OBSIDIAN_VAULT_NAME}"

  # Retry login with backoff — Obsidian's API returns a transient "Server overloaded".
  local attempt=1 max=5
  until ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"; do
    if [ "${attempt}" -ge "${max}" ]; then
      echo "[entrypoint] ob login failed after ${max} attempts." >&2
      return 1
    fi
    local wait=$((attempt * 10))
    echo "[entrypoint] ob login attempt ${attempt}/${max} failed; retrying in ${wait}s..." >&2
    sleep "${wait}"
    attempt=$((attempt + 1))
  done

  # E2EE vaults require the encryption password (separate from the account password).
  local setup_args=(--vault "${OBSIDIAN_VAULT_NAME}" --path /vault)
  if [ -n "${OBSIDIAN_ENCRYPTION_PASSWORD}" ]; then
    setup_args+=(--password "${OBSIDIAN_ENCRYPTION_PASSWORD}")
  else
    echo "[entrypoint] WARNING: OBSIDIAN_ENCRYPTION_PASSWORD not set — an E2EE vault will fail sync-setup." >&2
  fi
  ob sync-setup "${setup_args[@]}" || return 1

  ob sync-config --path /vault --excluded-folders "${OBSIDIAN_EXCLUDED_FOLDERS:-.opencode}" || true
  ob sync --path /vault || return 1     # initial pull/merge (blocking)
  ob sync --path /vault --continuous &  # background continuous sync
  echo "[entrypoint] Obsidian continuous sync started."
}

# The vault is ephemeral on Railway, so the Obsidian Sync cloud is the source of truth.
if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  obsidian_sync || echo "[entrypoint] Obsidian sync failed — starting opencode web WITHOUT sync." >&2
fi

# ── Google Workspace CLI (gws): materialize credentials from the injected secret ──
# gws reads GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE (higher priority than the OS keyring),
# so we write the exported credentials JSON to a file each boot and point gws at it.
# opencode inherits the exported var, so crew agents that shell out to `gws` are authed.
if [ -n "${GWS_CREDENTIALS_JSON}" ]; then
  mkdir -p "${HOME}/.config/gws"
  printf '%s' "${GWS_CREDENTIALS_JSON}" > "${HOME}/.config/gws/credentials.json"
  chmod 600 "${HOME}/.config/gws/credentials.json"
  export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE="${HOME}/.config/gws/credentials.json"
  echo "[entrypoint] gws credentials materialized for Google Workspace access."
fi

# ── OpenCode web server ──────────────────────────────────────────────────────
# Runs from /vault (Dockerfile WORKDIR) so it loads .opencode/ and AGENTS.md.
# Binds 0.0.0.0 so Railway's public proxy can reach it; auth via OPENCODE_SERVER_PASSWORD.
exec opencode web --port "${PORT}" --hostname 0.0.0.0
