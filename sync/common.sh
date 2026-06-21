#!/bin/bash

sync_log() {
  printf '[sync] %s\n' "$*"
}

sync_error() {
  printf '[sync] ERROR: %s\n' "$*" >&2
}

sync_bool_true() {
  case "${1:-}" in
    true|TRUE|1|yes|YES|y|Y) return 0 ;;
    *) return 1 ;;
  esac
}

sync_selected_backend() {
  if [ -n "${SYNC_BACKEND:-}" ]; then
    printf '%s' "${SYNC_BACKEND}"
  elif [ -n "${OBSIDIAN_VAULT_NAME:-}" ]; then
    printf '%s' "obsidian"
  else
    printf '%s' "none"
  fi
}

sync_validate_backend() {
  case "$1" in
    none|obsidian) return 0 ;;
    *) return 1 ;;
  esac
}

sync_load_backend() {
  local backend="$1"
  local module_dir="$2"

  if ! sync_validate_backend "${backend}"; then
    sync_error "Unknown SYNC_BACKEND '${backend}'. Valid values: none, obsidian."
    return 1
  fi

  # shellcheck source=/dev/null
  source "${module_dir}/${backend}.sh"
}
