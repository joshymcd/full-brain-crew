#!/bin/bash

sync_prepare() {
  local workspace_path="$1"
  mkdir -p "${workspace_path}"
  sync_log "Local persistence backend selected; using workspace at ${workspace_path}."
  sync_log "No remote sync will run. Persist ${workspace_path} with a Docker bind mount, Railway volume, or host filesystem."
}

sync_start() {
  local workspace_path="$1"
  sync_log "No background sync for local workspace ${workspace_path}."
}
