#!/bin/bash

sync_prepare() {
  local workspace_path="$1"
  mkdir -p "${workspace_path}"
  sync_log "External sync disabled; using local workspace at ${workspace_path}."
}

sync_start() {
  local workspace_path="$1"
  sync_log "No background sync for ${workspace_path}."
}
