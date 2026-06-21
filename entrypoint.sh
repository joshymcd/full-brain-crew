#!/bin/bash
set -e

PORT="${PORT:-8080}"
WORKSPACE_PATH="${WORKSPACE_PATH:-/vault}"
SYNC_MODULE_DIR="${SYNC_MODULE_DIR:-/usr/local/lib/full-brain-crew/sync}"

install_full_brain_crew() {
  local repo="${CREW_REPO:-https://github.com/gnekt/My-Brain-Is-Full-Crew.git}"
  local ref="${CREW_REF:-main}"
  local workspace_path="$1"
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
  (cd "${src}" && printf 'c\n' | bash scripts/launchme.sh --platform opencode --target "${workspace_path}")
  echo "[entrypoint] Full Brain Crew install/update complete."
}

ensure_workspace_git() {
  local workspace_path="$1"

  if [ ! -d "${workspace_path}/.git" ]; then
    git -C "${workspace_path}" init -q
    echo "[entrypoint] Initialized ${workspace_path} as a git worktree for OpenCode project detection."
  fi
}

handle_sync_failure() {
  local step_name="$1"

  if sync_bool_true "${SYNC_REQUIRED:-false}"; then
    echo "[entrypoint] Sync ${step_name} failed and SYNC_REQUIRED=true; exiting." >&2
    return 1
  fi

  echo "[entrypoint] Sync ${step_name} failed - starting opencode web WITHOUT working sync." >&2
}

# The workspace is ephemeral on Railway unless a sync backend restores and persists it.
# Obsidian remains selected automatically when OBSIDIAN_VAULT_NAME is set and SYNC_BACKEND is unset.
# shellcheck source=/dev/null
source "${SYNC_MODULE_DIR}/common.sh"

SYNC_BACKEND_SELECTED="$(sync_selected_backend)"
sync_load_backend "${SYNC_BACKEND_SELECTED}" "${SYNC_MODULE_DIR}"
echo "[entrypoint] Sync backend: ${SYNC_BACKEND_SELECTED}"

SYNC_PREPARED=true
if ! sync_prepare "${WORKSPACE_PATH}"; then
  handle_sync_failure "prepare"
  SYNC_PREPARED=false
fi

if [ "${SYNC_PREPARED}" = true ]; then
  if ! sync_start "${WORKSPACE_PATH}"; then
    handle_sync_failure "start"
  fi
fi

install_full_brain_crew "${WORKSPACE_PATH}"

# -- Google Workspace CLI (gws): materialize credentials from the injected secret --
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

# -- OpenCode web server ------------------------------------------------------
# Runs from the workspace so it loads .opencode/ and AGENTS.md.
# Binds 0.0.0.0 so Railway's public proxy can reach it; auth via OPENCODE_SERVER_PASSWORD.
ensure_workspace_git "${WORKSPACE_PATH}"
cd "${WORKSPACE_PATH}"
exec opencode web --port "${PORT}" --hostname 0.0.0.0
