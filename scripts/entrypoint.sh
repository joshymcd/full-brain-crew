#!/bin/bash
set -e

PORT="${PORT:-8080}"
WORKSPACE_PATH="${WORKSPACE_PATH:-/vault}"
RUNTIME_SCRIPT_DIR="${RUNTIME_SCRIPT_DIR:-/usr/local/lib/full-brain-crew/scripts}"
SYNC_MODULE_DIR="${SYNC_MODULE_DIR:-${RUNTIME_SCRIPT_DIR}/sync}"

# shellcheck source=/dev/null
source "${RUNTIME_SCRIPT_DIR}/sync/common.sh"
# shellcheck source=/dev/null
source "${RUNTIME_SCRIPT_DIR}/lib/crew.sh"
# shellcheck source=/dev/null
source "${RUNTIME_SCRIPT_DIR}/lib/gws.sh"
# shellcheck source=/dev/null
source "${RUNTIME_SCRIPT_DIR}/lib/workspace.sh"

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
configure_gws_credentials
ensure_workspace_git "${WORKSPACE_PATH}"

cd "${WORKSPACE_PATH}"
exec opencode web --port "${PORT}" --hostname 0.0.0.0
