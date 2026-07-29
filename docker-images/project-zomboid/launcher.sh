#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
PZ_INSTALL_DIR="${PZ_INSTALL_DIR:-${DATA_DIR}/server}"
PZ_DATA_DIR="${PZ_DATA_DIR:-${DATA_DIR}/zomboid}"
PZ_LAUNCHER="${PZ_LAUNCHER:-${PZ_INSTALL_DIR}/start-server.sh}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/project-zomboid}"
STOP_TIMEOUT_SECONDS="${STOP_TIMEOUT_SECONDS:-90}"

PZ_SERVERNAME="${PZ_SERVERNAME:-servertest}"
PZ_ADMIN_USERNAME="${PZ_ADMIN_USERNAME:-admin}"
PZ_ADMIN_PASSWORD="${PZ_ADMIN_PASSWORD:-}"
PZ_START_PARAMS="${PZ_START_PARAMS:-}"

LOG_PREFIX="[pz]"

. /app/common.sh

if [ -z "${PZ_ADMIN_PASSWORD}" ]; then
  die "PZ_ADMIN_PASSWORD is required: Project Zomboid needs an admin password to start non-interactively."
fi

FIFO="$(pz_fifo_path)"
PID_FILE="$(pz_pid_file_path)"

STOP_REQUESTED="false"

mkdir -p "${PZ_DATA_DIR}" "${PZ_DATA_DIR}/mods" "${RUNTIME_DIR}"

cleanup() {
  rm -f "${PID_FILE}" "${FIFO}"
}
trap cleanup EXIT

rm -f "${FIFO}"
mkfifo "${FIFO}"

exec 3<>"${FIFO}"

graceful_stop() {
  if [ "${STOP_REQUESTED}" = "true" ]; then
    return 0
  fi

  STOP_REQUESTED="true"
  log "Shutdown requested, sending 'quit' to Project Zomboid..."

  if is_pz_server_running; then
    printf '%s\n' "quit" >&3 || true

    RUNNING_PID="$(read_pz_pid)"
    DEADLINE=$(( $(date +%s) + STOP_TIMEOUT_SECONDS ))

    while kill -0 "${RUNNING_PID}" 2>/dev/null; do
      if [ "$(date +%s)" -ge "${DEADLINE}" ]; then
        log "Project Zomboid did not stop in time, killing process..."
        kill -TERM "${RUNNING_PID}" 2>/dev/null || true
        sleep 2
        kill -KILL "${RUNNING_PID}" 2>/dev/null || true
        break
      fi

      sleep 1
    done
  fi
}

trap graceful_stop TERM INT

if [ ! -x "${PZ_LAUNCHER}" ]; then
  die "Project Zomboid launch script not found: ${PZ_LAUNCHER}"
fi

cd "${PZ_INSTALL_DIR}"

set -- "${PZ_LAUNCHER}" \
  -cachedir="${PZ_DATA_DIR}" \
  -servername "${PZ_SERVERNAME}" \
  -adminusername "${PZ_ADMIN_USERNAME}" \
  -adminpassword "${PZ_ADMIN_PASSWORD}"

if [ -n "${PZ_START_PARAMS}" ]; then
  set -f
  set -- "$@" ${PZ_START_PARAMS}
  set +f
fi

"$@" <&3 &
PZ_PID=$!

echo "${PZ_PID}" > "${PID_FILE}"
log "Server PID: ${PZ_PID}"
log "Launching Project Zomboid dedicated server (world: ${PZ_SERVERNAME})..."

EXIT_CODE=0

while :; do
  if wait "${PZ_PID}"; then
    EXIT_CODE=0
    break
  fi

  EXIT_CODE=$?

  if kill -0 "${PZ_PID}" 2>/dev/null; then
    continue
  fi

  break
done

log "Project Zomboid server exited with code ${EXIT_CODE}"
exit "${EXIT_CODE}"
