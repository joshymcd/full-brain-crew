#!/bin/bash

ensure_workspace_git() {
  local workspace_path="$1"

  if [ ! -d "${workspace_path}/.git" ]; then
    git -C "${workspace_path}" init -q
    echo "[entrypoint] Initialized ${workspace_path} as a git worktree for OpenCode project detection."
  fi
}
