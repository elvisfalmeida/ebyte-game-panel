#!/bin/sh
set -eu

RUNTIME_DIR="${RUNTIME_DIR:-/run/project-zomboid}"
LOG_PREFIX="[pz-health]"

HEALTHCHECK_PORT="${HEALTHCHECK_PORT:-16261}"
HEALTHCHECK_REQUIRE_BIND="${HEALTHCHECK_REQUIRE_BIND:-true}"

. /app/common.sh

if ! is_pz_server_running; then
  die "Project Zomboid server process is not running."
fi

if is_truthy "${HEALTHCHECK_REQUIRE_BIND}"; then
  if ! ss -H -u -l -n "sport = :${HEALTHCHECK_PORT}" 2>/dev/null | grep -q .; then
    die "Project Zomboid game port ${HEALTHCHECK_PORT}/udp is not bound yet."
  fi
fi
