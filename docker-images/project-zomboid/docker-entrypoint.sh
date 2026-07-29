#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
PZ_INSTALL_DIR="${PZ_INSTALL_DIR:-${DATA_DIR}/server}"
PZ_DATA_DIR="${PZ_DATA_DIR:-${DATA_DIR}/zomboid}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/project-zomboid}"
STEAMCMD_DIR="${STEAMCMD_DIR:-/opt/steamcmd}"
PZ_MODS_STEAM_HOME="${PZ_MODS_STEAM_HOME:-${DATA_DIR}/.gamepanel/steamcmd}"
PZ_STEAM_APP_ID="${PZ_STEAM_APP_ID:-380870}"
PZ_BRANCH="${PZ_BRANCH:-}"
PZ_UPDATE_ON_START="${PZ_UPDATE_ON_START:-false}"
PZ_VALIDATE_ON_START="${PZ_VALIDATE_ON_START:-false}"
LOG_PREFIX="[pz]"

. /app/common.sh

PZ_LAUNCHER="${PZ_LAUNCHER:-${PZ_INSTALL_DIR}/start-server.sh}"
STEAMCMD_BIN="${STEAMCMD_DIR}/steamcmd.sh"

log "Starting bootstrap..."

if [ "$#" -gt 0 ]; then
  log "Custom command requested, bypassing server bootstrap."
  exec "$@"
fi

assert_safe_data_dir
assert_writable_dir "${DATA_DIR}"
assert_writable_dir "${RUNTIME_DIR}"
assert_writable_dir "${PZ_INSTALL_DIR}"
assert_writable_dir "${PZ_DATA_DIR}"

if [ ! -x "${STEAMCMD_BIN}" ]; then
  die "SteamCMD executable not found: ${STEAMCMD_BIN}"
fi

setup_steam_runtime_paths() {
  mkdir -p "${HOME}/.steam/sdk64" "${HOME}/.steam/sdk32"

  if [ -f "${STEAMCMD_DIR}/linux64/steamclient.so" ]; then
    ln -sf "${STEAMCMD_DIR}/linux64/steamclient.so" "${HOME}/.steam/sdk64/steamclient.so"
  fi

  if [ -f "${STEAMCMD_DIR}/linux32/steamclient.so" ]; then
    ln -sf "${STEAMCMD_DIR}/linux32/steamclient.so" "${HOME}/.steam/sdk32/steamclient.so"
  fi
}

install_or_update_pz() {
  UPDATE_REASON=""
  VALIDATE_APP="false"

  if [ ! -x "${PZ_LAUNCHER}" ]; then
    UPDATE_REASON="server files are missing"
    VALIDATE_APP="true"
  elif is_truthy "${PZ_UPDATE_ON_START}"; then
    UPDATE_REASON="PZ_UPDATE_ON_START is enabled"
  fi

  if is_truthy "${PZ_VALIDATE_ON_START}"; then
    VALIDATE_APP="true"
  fi

  if [ -z "${UPDATE_REASON}" ] && [ "${VALIDATE_APP}" != "true" ]; then
    log "Found existing Project Zomboid installation, skipping SteamCMD update."
    return 0
  fi

  if [ -n "${UPDATE_REASON}" ]; then
    log "Running SteamCMD update because ${UPDATE_REASON}."
  else
    log "Running SteamCMD validation."
  fi

  if [ -n "${PZ_BRANCH}" ]; then
    log "Using Steam branch '${PZ_BRANCH}'."
  fi

  set -- "${STEAMCMD_BIN}" \
    +force_install_dir "${PZ_INSTALL_DIR}" \
    +login anonymous \
    +app_update "${PZ_STEAM_APP_ID}"

  if [ -n "${PZ_BRANCH}" ]; then
    set -- "$@" -beta "${PZ_BRANCH}"
  fi

  if [ "${VALIDATE_APP}" = "true" ]; then
    set -- "$@" validate
  fi

  set -- "$@" +quit

  STEAMCMD_MAX_ATTEMPTS="${STEAMCMD_MAX_ATTEMPTS:-5}"
  STEAMCMD_RETRY_DELAY_SECONDS="${STEAMCMD_RETRY_DELAY_SECONDS:-10}"
  ATTEMPT=1

  while :; do
    if "$@"; then
      break
    fi

    if [ "${ATTEMPT}" -ge "${STEAMCMD_MAX_ATTEMPTS}" ]; then
      die "SteamCMD failed after ${ATTEMPT} attempt(s)."
    fi

    log "SteamCMD attempt ${ATTEMPT}/${STEAMCMD_MAX_ATTEMPTS} failed (known transient SteamCMD 'Missing configuration' error on a cold cache); retrying in ${STEAMCMD_RETRY_DELAY_SECONDS}s..."
    ATTEMPT=$((ATTEMPT + 1))
    sleep "${STEAMCMD_RETRY_DELAY_SECONDS}"
  done
}

prewarm_mods_steamcmd() {
  if [ -f "${PZ_MODS_STEAM_HOME}/.prewarmed" ]; then
    return 0
  fi

  log "Pre-warming the mod-resolution SteamCMD cache (one-time)..."
  mkdir -p "${PZ_MODS_STEAM_HOME}"
  ( HOME="${PZ_MODS_STEAM_HOME}" "${STEAMCMD_BIN}" +login anonymous +quit >/dev/null 2>&1 || true )
  : > "${PZ_MODS_STEAM_HOME}/.prewarmed"
}

install_or_update_pz

prewarm_mods_steamcmd

setup_steam_runtime_paths

if [ ! -x "${PZ_LAUNCHER}" ]; then
  die "Project Zomboid launch script is not executable after install/update: ${PZ_LAUNCHER}"
fi

export DATA_DIR
export PZ_INSTALL_DIR
export PZ_DATA_DIR
export PZ_LAUNCHER
export RUNTIME_DIR

log "Bootstrap complete, handing over to launcher..."
exec /app/launcher.sh
