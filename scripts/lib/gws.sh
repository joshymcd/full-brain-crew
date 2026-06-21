#!/bin/bash

configure_gws_credentials() {
  if [ -z "${GWS_CREDENTIALS_JSON}" ]; then
    return 0
  fi

  # gws reads GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE (higher priority than the OS keyring),
  # so we write the exported credentials JSON to a file each boot and point gws at it.
  mkdir -p "${HOME}/.config/gws"
  printf '%s' "${GWS_CREDENTIALS_JSON}" > "${HOME}/.config/gws/credentials.json"
  chmod 600 "${HOME}/.config/gws/credentials.json"
  export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE="${HOME}/.config/gws/credentials.json"
  echo "[entrypoint] gws credentials materialized for Google Workspace access."
}
