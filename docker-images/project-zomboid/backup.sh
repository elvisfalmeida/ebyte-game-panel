#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
PZ_DATA_DIR="${PZ_DATA_DIR:-${DATA_DIR}/zomboid}"
PZ_SERVERNAME="${PZ_SERVERNAME:-servertest}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-projectzomboid}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/project-zomboid}"
BACKUP_LOCK_DIR="${BACKUP_LOCK_DIR:-${BACKUP_DIR}/.backup.lock}"
SAVE_FLUSH_WAIT_SECONDS="${SAVE_FLUSH_WAIT_SECONDS:-5}"
LOG_PREFIX="[pz-backup]"

. /app/common.sh

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE_NAME="${BACKUP_PREFIX}-${TIMESTAMP}.tar.gz"
TMP_ARCHIVE="${BACKUP_DIR}/.${ARCHIVE_NAME}.tmp"
FINAL_ARCHIVE="${BACKUP_DIR}/${ARCHIVE_NAME}"

LOCK_ACQUIRED="false"

assert_safe_data_dir
mkdir -p "${BACKUP_DIR}" "${RUNTIME_DIR}"
assert_writable_dir "${BACKUP_DIR}"

cleanup() {
  rm -f "${TMP_ARCHIVE}" 2>/dev/null || true

  if [ "${LOCK_ACQUIRED}" = "true" ]; then
    rmdir "${BACKUP_LOCK_DIR}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM HUP

if ! mkdir "${BACKUP_LOCK_DIR}" 2>/dev/null; then
  die "Another backup is already running."
fi
LOCK_ACQUIRED="true"

if [ ! -d "${PZ_DATA_DIR}" ]; then
  die "Project Zomboid data directory not found: ${PZ_DATA_DIR}"
fi

create_archive() {
  BACKUP_PATHS=""
  for CANDIDATE in \
    "Saves/Multiplayer/${PZ_SERVERNAME}" \
    "db/${PZ_SERVERNAME}.db" \
    "Server"; do
    if [ -e "${PZ_DATA_DIR}/${CANDIDATE}" ]; then
      BACKUP_PATHS="${BACKUP_PATHS} ${CANDIDATE}"
    fi
  done

  if [ -z "${BACKUP_PATHS}" ]; then
    die "Nothing to back up yet under ${PZ_DATA_DIR} (has the world been created?)."
  fi

  log "Archiving:${BACKUP_PATHS}"
  set -f
  tar -czf "${TMP_ARCHIVE}" -C "${PZ_DATA_DIR}" ${BACKUP_PATHS}
  set +f
}

log "Backup file: ${FINAL_ARCHIVE}"

if is_pz_server_running; then
  log "Server is running: hot backup (flushing world with 'save')..."
  /app/send-command.sh "save" || log "WARNING: 'save' command failed; continuing best-effort."
  sleep "${SAVE_FLUSH_WAIT_SECONDS}"
  create_archive
else
  log "Server is not running: cold backup."
  create_archive
fi

mv "${TMP_ARCHIVE}" "${FINAL_ARCHIVE}"
log "Backup completed: ${FINAL_ARCHIVE}"
