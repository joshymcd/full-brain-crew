#!/bin/bash

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

obsidian_login() {
  local attempt=1 max=5

  until ob login --email "${OBSIDIAN_EMAIL}" --password "${OBSIDIAN_PASSWORD}"; do
    if [ "${attempt}" -ge "${max}" ]; then
      sync_error "ob login failed after ${max} attempts."
      return 1
    fi

    local wait=$((attempt * 10))
    sync_error "ob login attempt ${attempt}/${max} failed; retrying in ${wait}s..."
    sleep "${wait}"
    attempt=$((attempt + 1))
  done
}

sync_prepare() {
  local workspace_path="$1"

  sync_log "Obsidian sync enabled for vault: ${OBSIDIAN_VAULT_NAME}"
  mkdir -p "${workspace_path}"

  obsidian_login || return 1

  # E2EE vaults require the encryption password (separate from the account password).
  local setup_args=(--vault "${OBSIDIAN_VAULT_NAME}" --path "${workspace_path}")
  if [ -n "${OBSIDIAN_ENCRYPTION_PASSWORD}" ]; then
    setup_args+=(--password "${OBSIDIAN_ENCRYPTION_PASSWORD}")
  else
    sync_error "WARNING: OBSIDIAN_ENCRYPTION_PASSWORD not set - an E2EE vault will fail sync-setup."
  fi

  ob sync-setup "${setup_args[@]}" || return 1
  ob sync-config --path "${workspace_path}" --excluded-folders "$(obsidian_excluded_folders)" || true
  ob sync --path "${workspace_path}" || return 1
}

sync_start() {
  local workspace_path="$1"

  ob sync --path "${workspace_path}" --continuous &
  sync_log "Obsidian continuous sync started."
}
