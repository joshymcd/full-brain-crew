# Debian 13 (Trixie, glibc 2.41) — the gws CLI binary requires GLIBC >= 2.39,
# which Bookworm (glibc 2.36) does not provide.
FROM node:22-trixie-slim

LABEL org.opencontainers.image.title="Full Brain Crew on Railway" \
      org.opencontainers.image.description="OpenCode web UI with Full Brain Crew, optional Obsidian Sync, and Google Workspace CLI" \
      org.opencontainers.image.source="https://github.com/joshymcd/full-brain-crew" \
      org.opencontainers.image.base.name="docker.io/library/node:22-trixie-slim"

# git: clone the crew repo.  jq + gawk: required by the opencode config-merge adapter.
# ca-certificates: TLS for git https and npm postinstall binary fetches.
# libsecret-1-0: keyring backend the gws CLI may load at runtime.
RUN apt-get update && apt-get install -y git jq gawk ca-certificates libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# opencode web tries to open a local browser via xdg-open. This image runs headless
# on Railway and in Docker Compose, so provide a no-op opener to avoid noisy ENOENT logs.
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/xdg-open \
    && chmod +x /usr/local/bin/xdg-open

# Obsidian Headless (optional vault sync) — requires Node 22+ (satisfied by the base image)
RUN npm install -g obsidian-headless

# Google Workspace CLI (optional) — the crew's Postman agent shells out to `gws` for
# Gmail/Calendar. Auth is supplied at runtime via GWS_CREDENTIALS_JSON (see entrypoint).
RUN npm install -g @googleworkspace/cli

# Install the Full Brain Crew into /vault: generates .opencode/ (agents/skills),
# AGENTS.md (the opencode dispatcher), and the vault folder structure.
# --platform opencode + --target /vault run launchme.sh non-interactively.
# Override CREW_REPO for forks/dev builds. Pin CREW_REF to a commit for reproducible builds.
ARG CREW_REPO=https://github.com/gnekt/My-Brain-Is-Full-Crew.git
ARG CREW_REF=main
RUN mkdir -p /vault
RUN git clone "${CREW_REPO}" /tmp/my-brain-is-full-crew \
    && cd /tmp/my-brain-is-full-crew \
    && git checkout "${CREW_REF}" \
    && bash scripts/launchme.sh --platform opencode --target /vault \
    && rm -rf /tmp/my-brain-is-full-crew

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# opencode resolves .opencode/ and AGENTS.md from its working directory, so run from /vault.
WORKDIR /vault
ENTRYPOINT ["/entrypoint.sh"]
