#!/bin/bash
set -e

WORKSPACE_PATH="${WORKSPACE_PATH:-/vault}"
RUNTIME_SCRIPT_DIR="${RUNTIME_SCRIPT_DIR:-/usr/local/lib/full-brain-crew/scripts}"
SYNC_MODULE_DIR="${SYNC_MODULE_DIR:-${RUNTIME_SCRIPT_DIR}/sync}"
OPENCODE_INTERNAL_HOST="${OPENCODE_INTERNAL_HOST:-127.0.0.1}"
OPENCODE_INTERNAL_PORT="${OPENCODE_INTERNAL_PORT:-8081}"

url_origin() {
  node -e 'try { const url = new URL(process.argv[1]); console.log(url.origin) } catch {}' "$1"
}

url_hostname() {
  node -e 'try { const url = new URL(process.argv[1]); console.log(url.hostname) } catch {}' "$1"
}

APP_PUBLIC_ORIGIN="${APP_PUBLIC_URL:+$(url_origin "${APP_PUBLIC_URL}")}"
OPENCODE_PUBLIC_URL="${OPENCODE_PUBLIC_URL:-${VITE_OPENCODE_SERVER_URL:-}}"
OPENCODE_PUBLIC_HOST="${OPENCODE_PUBLIC_HOST:-${OPENCODE_PUBLIC_URL:+$(url_hostname "${OPENCODE_PUBLIC_URL}")}}"
export OPENCODE_PUBLIC_HOST="${OPENCODE_PUBLIC_HOST:-opencode.localhost}"

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

shutdown() {
  local exit_code="$?"

  trap - INT TERM EXIT
  if [ -n "${CADDY_PID:-}" ]; then
    kill "${CADDY_PID}" 2>/dev/null || true
  fi
  if [ -n "${OPENCODE_PID:-}" ]; then
    kill "${OPENCODE_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "${exit_code}"
}

trap shutdown INT TERM EXIT

OPENCODE_ARGS=(web --port "${OPENCODE_INTERNAL_PORT}" --hostname "${OPENCODE_INTERNAL_HOST}")
if [ -n "${APP_PUBLIC_ORIGIN}" ]; then
  OPENCODE_ARGS+=(--cors "${APP_PUBLIC_ORIGIN}")
fi

opencode "${OPENCODE_ARGS[@]}" &
OPENCODE_PID="$!"

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID="$!"

wait -n "${OPENCODE_PID}" "${CADDY_PID}"
