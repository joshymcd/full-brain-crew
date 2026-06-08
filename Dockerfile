FROM node:22-bookworm-slim

# git: clone the crew repo.  jq + gawk: required by the opencode config-merge adapter.
# ca-certificates: TLS for git https and the opencode-ai npm postinstall binary fetch.
RUN apt-get update && apt-get install -y git jq gawk ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# Obsidian Headless (optional vault sync) — requires Node 22+ (satisfied by the base image)
RUN npm install -g obsidian-headless

# Install the Full Brain Crew into the vault: generates .opencode/ (agents/skills),
# AGENTS.md (the opencode dispatcher), and the vault folder structure into /vault.
# --platform opencode + --target /vault run launchme.sh non-interactively.
# Pin to a commit for reproducible builds: docker build --build-arg CREW_REF=<sha>
ARG CREW_REF=main
RUN mkdir -p /vault
WORKDIR /vault
RUN git clone https://github.com/gnekt/My-Brain-Is-Full-Crew.git \
    && cd My-Brain-Is-Full-Crew \
    && git checkout "${CREW_REF}" \
    && bash scripts/launchme.sh --platform opencode --target /vault

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# opencode resolves .opencode/ and AGENTS.md from its working directory, so run from /vault.
WORKDIR /vault
ENTRYPOINT ["/entrypoint.sh"]
