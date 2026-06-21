#!/bin/bash

git_default_branch() {
  printf '%s' "${GIT_BRANCH:-main}"
}

git_sync_interval() {
  printf '%s' "${GIT_SYNC_INTERVAL_SECONDS:-60}"
}

git_commit_message() {
  printf '%s' "${GIT_COMMIT_MESSAGE:-Update workspace from Full Brain Crew}"
}

git_normalize_remote() {
  local remote="$1"
  remote="${remote%/}"
  remote="${remote%.git}"
  printf '%s' "${remote}"
}

git_workspace_empty() {
  local workspace_path="$1"

  [ -d "${workspace_path}" ] || return 0
  [ -z "$(ls -A "${workspace_path}")" ]
}

git_setup_auth() {
  export GIT_TERMINAL_PROMPT=0

  if [ -z "${GIT_TOKEN:-}" ]; then
    return 0
  fi

  export GIT_TOKEN
  export GIT_USERNAME="${GIT_USERNAME:-x-access-token}"

  local askpass="/tmp/full-brain-crew-git-askpass.sh"
  cat > "${askpass}" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' "${GIT_USERNAME:-x-access-token}" ;;
  *Password*) printf '%s\n' "${GIT_TOKEN}" ;;
  *) printf '\n' ;;
esac
EOF
  chmod 700 "${askpass}"
  export GIT_ASKPASS="${askpass}"
}

git_configure_identity() {
  local workspace_path="$1"

  git -C "${workspace_path}" config user.name "${GIT_AUTHOR_NAME:-Full Brain Crew}" || return 1
  git -C "${workspace_path}" config user.email "${GIT_AUTHOR_EMAIL:-full-brain-crew@example.invalid}" || return 1
}

git_remote_matches() {
  local workspace_path="$1"
  local configured_remote

  configured_remote="$(git -C "${workspace_path}" remote get-url origin 2>/dev/null || true)"
  [ -n "${configured_remote}" ] || return 1
  [ "$(git_normalize_remote "${configured_remote}")" = "$(git_normalize_remote "${GIT_REMOTE_URL}")" ]
}

git_clone_workspace() {
  local workspace_path="$1"
  local branch

  branch="$(git_default_branch)"
  mkdir -p "$(dirname "${workspace_path}")"
  mkdir -p "${workspace_path}"

  sync_log "Cloning Git workspace branch ${branch} from ${GIT_REMOTE_URL}."
  git clone --branch "${branch}" "${GIT_REMOTE_URL}" "${workspace_path}" || return 1
  git_configure_identity "${workspace_path}" || return 1
}

git_prepare_existing_checkout() {
  local workspace_path="$1"
  local branch

  branch="$(git_default_branch)"

  if ! git_remote_matches "${workspace_path}"; then
    sync_error "Git workspace origin does not match GIT_REMOTE_URL. Refusing to sync this workspace."
    return 1
  fi

  git_configure_identity "${workspace_path}" || return 1
  git -C "${workspace_path}" fetch origin || return 1

  if git -C "${workspace_path}" show-ref --verify --quiet "refs/heads/${branch}"; then
    git -C "${workspace_path}" checkout "${branch}" || return 1
  elif git -C "${workspace_path}" show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
    git -C "${workspace_path}" checkout -b "${branch}" "origin/${branch}" || return 1
  else
    sync_error "Remote branch origin/${branch} does not exist."
    return 1
  fi

  git_sync_once "${workspace_path}" || return 1
}

git_sync_once() {
  local workspace_path="$1"
  local branch
  local lock_dir="/tmp/full-brain-crew-git-sync.lock"

  branch="$(git_default_branch)"
  mkdir "${lock_dir}" 2>/dev/null || return 0
  trap 'rmdir "${lock_dir}" 2>/dev/null || true' RETURN

  git_setup_auth || return 1
  git_configure_identity "${workspace_path}" || return 1

  git -C "${workspace_path}" add -A || return 1
  if ! git -C "${workspace_path}" diff --cached --quiet; then
    git -C "${workspace_path}" commit -m "$(git_commit_message)" || return 1
  fi

  git -C "${workspace_path}" fetch origin || return 1
  if git -C "${workspace_path}" show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
    if ! git -C "${workspace_path}" rebase "origin/${branch}"; then
      git -C "${workspace_path}" rebase --abort >/dev/null 2>&1 || true
      sync_error "Git rebase conflict while syncing ${branch}; manual resolution is required."
      return 1
    fi
  fi

  git -C "${workspace_path}" push origin "HEAD:${branch}" || return 1
}

sync_prepare() {
  local workspace_path="$1"

  if [ -z "${GIT_REMOTE_URL:-}" ]; then
    sync_error "GIT_REMOTE_URL is required when SYNC_BACKEND=git."
    return 1
  fi

  git_setup_auth || return 1

  if git_workspace_empty "${workspace_path}"; then
    git_clone_workspace "${workspace_path}"
  elif [ -d "${workspace_path}/.git" ]; then
    sync_log "Preparing existing Git workspace at ${workspace_path}."
    git_prepare_existing_checkout "${workspace_path}"
  else
    sync_error "Workspace ${workspace_path} is non-empty and is not a Git checkout. Refusing to overwrite it."
    return 1
  fi
}

sync_start() {
  local workspace_path="$1"
  local interval

  interval="$(git_sync_interval)"
  sync_log "Starting Git sync loop every ${interval}s."

  (
    while true; do
      git_sync_once "${workspace_path}" || sync_error "Git sync loop failed; will retry."
      sleep "${interval}"
    done
  ) &
}
