#!/bin/bash

install_full_brain_crew() {
  local workspace_path="$1"
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
  (cd "${src}" && printf 'c\n' | bash scripts/launchme.sh --platform opencode --target "${workspace_path}")
  echo "[entrypoint] Full Brain Crew install/update complete."
}
