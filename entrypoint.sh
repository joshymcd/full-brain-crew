#!/bin/bash
set -e

PORT="${PORT:-8080}"

# OpenCode web server.
# Binds 0.0.0.0 so Railway's public proxy can reach it.
# Protected by OPENCODE_SERVER_PASSWORD (and optional OPENCODE_SERVER_USERNAME) if set.
exec opencode web --port "${PORT}" --hostname 0.0.0.0
