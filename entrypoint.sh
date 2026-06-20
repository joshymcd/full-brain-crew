#!/bin/bash
set -e

PORT="${PORT:-8080}"

install_full_brain_crew() {
  local repo="${CREW_REPO:-https://github.com/gnekt/My-Brain-Is-Full-Crew.git}"
  local ref="${CREW_REF:-main}"
  local runtime_src="/tmp/my-brain-is-full-crew"
  local bundled_src="/opt/my-brain-is-full-crew"
  local src=""

  rm -rf "${runtime_src}"

  echo "[entrypoint] Installing Full Brain Crew from ${repo} @ ${ref}."
  if git clone --depth 1 --branch "${ref}" "${repo}" "${runtime_src}"; then
    src="${runtime_src}"
  else
    echo "[entrypoint] Shallow clone failed; retrying full clone/checkout." >&2
    rm -rf "${runtime_src}"
    if git clone "${repo}" "${runtime_src}" && git -C "${runtime_src}" checkout "${ref}"; then
      src="${runtime_src}"
    elif [ -d "${bundled_src}/scripts" ]; then
      echo "[entrypoint] WARNING: using bundled Full Brain Crew source fallback." >&2
      src="${bundled_src}"
    else
      echo "[entrypoint] ERROR: unable to fetch Full Brain Crew and no bundled fallback exists." >&2
      return 1
    fi
  fi

  # The installer prompts before overwriting existing core files. Feed "c" so
  # boot-time reinstalls refresh crew-owned files while preserving vault notes
  # and custom agents according to the upstream installer semantics.
  (cd "${src}" && printf 'c\n' | bash scripts/launchme.sh --platform opencode --target /vault)
  echo "[entrypoint] Full Brain Crew install/update complete."
}

obsidian_excluded_folders() {
  local excludes="${OBSIDIAN_EXCLUDED_FOLDERS:-.opencode}"

  case ",${excludes}," in
    *",.opencode,"*) ;;
    *) excludes="${excludes},.opencode" ;;
  esac

  case ",${excludes}," in
    *",.git,"*) ;;
    *) excludes="${excludes},.git" ;;
  esac

  printf '%s' "${excludes}"
}

ensure_vault_git() {
  if [ ! -d /vault/.git ]; then
    git -C /vault init -q
    echo "[entrypoint] Initialized /vault as a git worktree for OpenCode project detection."
  fi
}

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

  ob sync-config --path /vault --excluded-folders "$(obsidian_excluded_folders)" || true
  ob sync --path /vault || return 1     # initial pull/merge (blocking)
  ob sync --path /vault --continuous &  # background continuous sync
  echo "[entrypoint] Obsidian continuous sync started."
}

# The vault is ephemeral on Railway, so the Obsidian Sync cloud is the source of truth.
if [ -n "${OBSIDIAN_VAULT_NAME}" ]; then
  obsidian_sync || echo "[entrypoint] Obsidian sync failed — starting opencode web WITHOUT sync." >&2
fi

install_full_brain_crew

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
ensure_vault_git
exec opencode web --port "${PORT}" --hostname 0.0.0.0
