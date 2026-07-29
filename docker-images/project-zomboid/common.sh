#!/bin/sh

LOG_PREFIX="${LOG_PREFIX:-[app]}"

log() {
  printf '%s %s\n' "${LOG_PREFIX}" "$*"
}

die() {
  printf '%s ERROR: %s\n' "${LOG_PREFIX}" "$*" >&2
  exit 1
}

is_truthy() {
  case "$1" in
    1|[Tt][Rr][Uu][Ee]|[Yy]|[Yy][Ee][Ss]|[Oo][Nn])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

assert_safe_data_dir() {
  case "${DATA_DIR:-}" in
    ""|"/")
      die "Refusing to operate on unsafe DATA_DIR='${DATA_DIR:-}'."
      ;;
  esac
}

assert_writable_dir() {
  TARGET_DIR="$1"
  TEST_FILE="${TARGET_DIR}/.writable-check-$$"

  if ! mkdir -p "${TARGET_DIR}" 2>/dev/null; then
    die "Directory '${TARGET_DIR}' cannot be created or accessed by user '$(id -un)' (uid=$(id -u), gid=$(id -g))."
  fi

  if ! : > "${TEST_FILE}" 2>/dev/null; then
    die "Directory '${TARGET_DIR}' is not writable by user '$(id -un)' (uid=$(id -u), gid=$(id -g))."
  fi

  rm -f "${TEST_FILE}"
}

pz_fifo_path() {
  printf '%s/stdin.fifo\n' "${RUNTIME_DIR:-/run/project-zomboid}"
}

pz_pid_file_path() {
  printf '%s/server.pid\n' "${RUNTIME_DIR:-/run/project-zomboid}"
}

read_pz_pid() {
  PZ_PID_FILE="$(pz_pid_file_path)"

  [ -f "${PZ_PID_FILE}" ] || return 1

  PZ_PID="$(cat "${PZ_PID_FILE}" 2>/dev/null || true)"
  case "${PZ_PID}" in
    ""|*[!0-9]*)
      return 1
      ;;
  esac

  printf '%s\n' "${PZ_PID}"
}

is_pz_server_running() {
  RUNNING_PID="$(read_pz_pid)" || return 1
  kill -0 "${RUNNING_PID}" 2>/dev/null
}

assert_pz_server_stopped() {
  if RUNNING_PID="$(read_pz_pid)" && kill -0 "${RUNNING_PID}" 2>/dev/null; then
    die "Project Zomboid server is still running with PID ${RUNNING_PID}. Stop the server before running this operation."
  fi
}
