#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
PZ_DATA_DIR="${PZ_DATA_DIR:-${DATA_DIR}/zomboid}"
PZ_SERVERNAME="${PZ_SERVERNAME:-servertest}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/project-zomboid}"
RESTORE_BACKUP="${RESTORE_BACKUP:-${1:-}}"
RESTORE_LOCK_DIR="${RESTORE_LOCK_DIR:-${PZ_DATA_DIR}/.restore.lock}"
LOG_PREFIX="[pz-restore]"

. /app/common.sh

RESTORE_TARGETS="Saves/Multiplayer/${PZ_SERVERNAME} db/${PZ_SERVERNAME}.db Server"

LOCK_ACQUIRED="false"
RESTORE_SUCCESS="false"
DATA_MOVED="false"
WORK_DIR=""

cleanup() {
  if [ "${RESTORE_SUCCESS}" != "true" ] && [ "${DATA_MOVED}" = "true" ] && [ -n "${WORK_DIR}" ] && [ -d "${WORK_DIR}/old" ]; then
    log "Restore failed before completion, rolling back the previous data..."
    set -f
    for REL in ${RESTORE_TARGETS}; do
      rm -rf "${PZ_DATA_DIR}/${REL}" 2>/dev/null || true
      if [ -e "${WORK_DIR}/old/${REL}" ]; then
        mkdir -p "$(dirname "${PZ_DATA_DIR}/${REL}")" 2>/dev/null || true
        mv "${WORK_DIR}/old/${REL}" "${PZ_DATA_DIR}/${REL}" 2>/dev/null || true
      fi
    done
    set +f
    DATA_MOVED="false"
  fi

  if [ -n "${WORK_DIR}" ] && [ -d "${WORK_DIR}" ]; then
    rm -rf "${WORK_DIR}" 2>/dev/null || true
  fi

  if [ "${LOCK_ACQUIRED}" = "true" ]; then
    rmdir "${RESTORE_LOCK_DIR}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM HUP

if [ -z "${RESTORE_BACKUP}" ]; then
  die "Usage: /app/restore.sh <backup-archive-name> (e.g. projectzomboid-20260713T120000Z.tar.gz)"
fi

case "${RESTORE_BACKUP}" in
  */*|..|.)
    die "Invalid backup name (path separators are not allowed): ${RESTORE_BACKUP}"
    ;;
esac

ARCHIVE_PATH="${BACKUP_DIR}/${RESTORE_BACKUP}"

assert_safe_data_dir
assert_writable_dir "${PZ_DATA_DIR}"

if [ ! -f "${ARCHIVE_PATH}" ]; then
  die "Backup archive not found: ${ARCHIVE_PATH}"
fi

assert_pz_server_stopped

if ! mkdir "${RESTORE_LOCK_DIR}" 2>/dev/null; then
  die "Another restore is already running."
fi
LOCK_ACQUIRED="true"

log "Starting restore from ${RESTORE_BACKUP}..."

WORK_DIR="$(mktemp -d "${PZ_DATA_DIR}/.restore-work.XXXXXX")"
mkdir -p "${WORK_DIR}/new" "${WORK_DIR}/old"

log "Extracting archive to staging..."
tar -xzf "${ARCHIVE_PATH}" -C "${WORK_DIR}/new"

log "Swapping in restored data..."
DATA_MOVED="true"
set -f
for REL in ${RESTORE_TARGETS}; do
  if [ -e "${WORK_DIR}/new/${REL}" ]; then
    if [ -e "${PZ_DATA_DIR}/${REL}" ]; then
      mkdir -p "$(dirname "${WORK_DIR}/old/${REL}")"
      mv "${PZ_DATA_DIR}/${REL}" "${WORK_DIR}/old/${REL}"
    fi
    mkdir -p "$(dirname "${PZ_DATA_DIR}/${REL}")"
    mv "${WORK_DIR}/new/${REL}" "${PZ_DATA_DIR}/${REL}"
  fi
done
set +f

RESTORE_SUCCESS="true"
log "Restore completed successfully."
