FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y curl ca-certificates git bash \
    && rm -rf /var/lib/apt/lists/*

# OpenCode (web UI + agent runtime)
RUN npm install -g opencode-ai

# Obsidian Headless (optional vault sync) — requires Node 22+
RUN npm install -g obsidian-headless

# Clone crew repo into vault and run installer.
# Pin to a specific commit for reproducible builds (override at build time with --build-arg CREW_REF=<sha>).
ARG CREW_REF=main
RUN mkdir -p /vault
WORKDIR /vault
RUN git clone https://github.com/gnekt/My-Brain-Is-Full-Crew.git \
    && cd My-Brain-Is-Full-Crew \
    && git checkout "${CREW_REF}"
WORKDIR /vault/My-Brain-Is-Full-Crew
RUN bash scripts/launchme.sh --platform opencode --target /vault

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /vault
ENTRYPOINT ["/entrypoint.sh"]
