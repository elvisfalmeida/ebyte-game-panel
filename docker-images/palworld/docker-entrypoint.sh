#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
PALWORLD_INSTALL_DIR="${PALWORLD_INSTALL_DIR:-${DATA_DIR}/server}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/palworld}"
STEAMCMD_DIR="${STEAMCMD_DIR:-/opt/steamcmd}"
PALWORLD_STEAM_APP_ID="${PALWORLD_STEAM_APP_ID:-2394010}"
PALWORLD_UPDATE_ON_START="${PALWORLD_UPDATE_ON_START:-false}"
PALWORLD_VALIDATE_ON_START="${PALWORLD_VALIDATE_ON_START:-false}"
PALWORLD_START_PARAMS="${PALWORLD_START_PARAMS:-}"
PALWORLD_COMMUNITY_SERVER="${PALWORLD_COMMUNITY_SERVER:-true}"
PALWORLD_PUBLIC_IP="${PALWORLD_PUBLIC_IP:-}"
PALWORLD_PUBLIC_PORT="${PALWORLD_PUBLIC_PORT:-8211}"
PALWORLD_ADMIN_PASSWORD="${PALWORLD_ADMIN_PASSWORD:-}"
LOG_PREFIX="[palworld]"

. /app/common.sh

PALWORLD_LAUNCHER="${PALWORLD_LAUNCHER:-${PALWORLD_INSTALL_DIR}/PalServer.sh}"
PALWORLD_SERVER_BIN="${PALWORLD_SERVER_BIN:-${PALWORLD_INSTALL_DIR}/Pal/Binaries/Linux/PalServer-Linux-Shipping}"
STEAMCMD_BIN="${STEAMCMD_DIR}/steamcmd.sh"

log "Starting bootstrap..."

if [ "$#" -gt 0 ]; then
  log "Custom command requested, bypassing server bootstrap."
  exec "$@"
fi

assert_safe_data_dir
assert_writable_dir "${DATA_DIR}"
assert_writable_dir "${RUNTIME_DIR}"
assert_writable_dir "${PALWORLD_INSTALL_DIR}"

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

is_valid_public_ipv4() {
  printf '%s\n' "$1" | awk -F. '
    NF != 4 { exit 1 }
    {
      for (i = 1; i <= 4; i++) {
        if ($i !~ /^[0-9]+$/ || $i < 0 || $i > 255) exit 1
      }
      if ($1 == 0 || $1 == 10 || $1 == 127 || ($1 == 169 && $2 == 254) ||
          ($1 == 172 && $2 >= 16 && $2 <= 31) || ($1 == 192 && $2 == 168) || $1 >= 224) exit 1
    }
  '
}

detect_public_ipv4() {
  if [ -n "${PALWORLD_PUBLIC_IP}" ]; then
    if is_valid_public_ipv4 "${PALWORLD_PUBLIC_IP}"; then
      printf '%s\n' "${PALWORLD_PUBLIC_IP}"
      return 0
    fi
    die "PALWORLD_PUBLIC_IP is not a valid public IPv4 address."
  fi

  for LOOKUP_URL in "https://api.ipify.org" "https://ifconfig.me/ip"; do
    DETECTED_IP="$(curl -4fsS --connect-timeout 3 --max-time 5 "${LOOKUP_URL}" 2>/dev/null | tr -d '[:space:]' || true)"
    if is_valid_public_ipv4 "${DETECTED_IP}"; then
      printf '%s\n' "${DETECTED_IP}"
      return 0
    fi
  done

  return 1
}

configure_start_params() {
  if [ -n "${PALWORLD_START_PARAMS}" ]; then
    log "Using explicitly configured PALWORLD_START_PARAMS."
    return 0
  fi

  if ! is_truthy "${PALWORLD_COMMUNITY_SERVER}"; then
    log "Community server publishing is disabled."
    return 0
  fi

  case "${PALWORLD_PUBLIC_PORT}" in
    ''|*[!0-9]*) die "PALWORLD_PUBLIC_PORT must be a number between 1 and 65535." ;;
  esac
  if [ "${PALWORLD_PUBLIC_PORT}" -lt 1 ] || [ "${PALWORLD_PUBLIC_PORT}" -gt 65535 ]; then
    die "PALWORLD_PUBLIC_PORT must be a number between 1 and 65535."
  fi

  PALWORLD_START_PARAMS="-publiclobby"
  if DETECTED_PUBLIC_IP="$(detect_public_ipv4)"; then
    PALWORLD_PUBLIC_IP="${DETECTED_PUBLIC_IP}"
    PALWORLD_START_PARAMS="${PALWORLD_START_PARAMS} -publicip=${PALWORLD_PUBLIC_IP}"
    log "Community server enabled with public endpoint ${PALWORLD_PUBLIC_IP}:${PALWORLD_PUBLIC_PORT}."
  else
    log "Community server enabled; public IP lookup failed, so Palworld will detect it automatically."
  fi
  PALWORLD_START_PARAMS="${PALWORLD_START_PARAMS} -publicport=${PALWORLD_PUBLIC_PORT}"
}

install_or_update_palworld() {
  UPDATE_REASON=""
  VALIDATE_APP="false"

  if [ ! -x "${PALWORLD_SERVER_BIN}" ]; then
    UPDATE_REASON="server binary is missing"
    VALIDATE_APP="true"
  elif is_truthy "${PALWORLD_UPDATE_ON_START}"; then
    UPDATE_REASON="PALWORLD_UPDATE_ON_START is enabled"
  fi

  if is_truthy "${PALWORLD_VALIDATE_ON_START}"; then
    VALIDATE_APP="true"
  fi

  if [ -z "${UPDATE_REASON}" ] && [ "${VALIDATE_APP}" != "true" ]; then
    log "Found existing Palworld installation, skipping SteamCMD update."
    return 0
  fi

  if [ -n "${UPDATE_REASON}" ]; then
    log "Running SteamCMD update because ${UPDATE_REASON}."
  else
    log "Running SteamCMD validation."
  fi

  set -- "${STEAMCMD_BIN}" \
    +force_install_dir "${PALWORLD_INSTALL_DIR}" \
    +login anonymous \
    +app_update "${PALWORLD_STEAM_APP_ID}"

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

ensure_option_setting() {
  OPT_KEY="$1"
  OPT_VALUE="$2"
  OPT_FILE="$3"

  if grep -q "[(,]${OPT_KEY}=" "${OPT_FILE}"; then
    sed -i "s|\([(,]\)${OPT_KEY}=[^,)]*|\1${OPT_KEY}=${OPT_VALUE}|" "${OPT_FILE}"
  else
    sed -i "s|OptionSettings=(|OptionSettings=(${OPT_KEY}=${OPT_VALUE},|" "${OPT_FILE}"
  fi
}

configure_rest_api() {
  PALWORLD_CONFIG_DIR="${PALWORLD_INSTALL_DIR}/Pal/Saved/Config/LinuxServer"
  PALWORLD_CONFIG_FILE="${PALWORLD_CONFIG_DIR}/PalWorldSettings.ini"

  mkdir -p "${PALWORLD_CONFIG_DIR}"

  if [ ! -f "${PALWORLD_CONFIG_FILE}" ] || ! grep -q '^\[/Script/Pal\.PalGameWorldSettings\]' "${PALWORLD_CONFIG_FILE}"; then
    printf '%s\nOptionSettings=()\n' '[/Script/Pal.PalGameWorldSettings]' > "${PALWORLD_CONFIG_FILE}"
  elif ! grep -q 'OptionSettings=(' "${PALWORLD_CONFIG_FILE}"; then
    printf 'OptionSettings=()\n' >> "${PALWORLD_CONFIG_FILE}"
  fi

  ensure_option_setting "RESTAPIEnabled" "True" "${PALWORLD_CONFIG_FILE}"
  ensure_option_setting "RESTAPIPort" "8212" "${PALWORLD_CONFIG_FILE}"

  if [ -n "${PALWORLD_ADMIN_PASSWORD}" ]; then
    ensure_option_setting "AdminPassword" "\"${PALWORLD_ADMIN_PASSWORD}\"" "${PALWORLD_CONFIG_FILE}"
  elif ! grep -q '[(,]AdminPassword="[^"]' "${PALWORLD_CONFIG_FILE}"; then
    GENERATED_ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 24 || true)"
    ensure_option_setting "AdminPassword" "\"${GENERATED_ADMIN_PASSWORD}\"" "${PALWORLD_CONFIG_FILE}"
    log "PALWORLD_ADMIN_PASSWORD is not set; generated a random REST API admin password."
  else
    log "PALWORLD_ADMIN_PASSWORD is not set; keeping the existing REST API admin password."
  fi

  sed -i 's|(,|(|g; s|,)|)|g' "${PALWORLD_CONFIG_FILE}"

  log "Enabled the Palworld REST API on port 8212 in PalWorldSettings.ini."
}

install_or_update_palworld

setup_steam_runtime_paths
configure_start_params

if [ ! -x "${PALWORLD_SERVER_BIN}" ]; then
  die "Palworld server binary is not executable after install/update: ${PALWORLD_SERVER_BIN}"
fi

configure_rest_api

write_gameserver_metadata

export DATA_DIR
export PALWORLD_INSTALL_DIR
export PALWORLD_LAUNCHER
export PALWORLD_SERVER_BIN
export RUNTIME_DIR
export PALWORLD_START_PARAMS

log "Bootstrap complete, handing over to launcher..."
exec /app/launcher.sh
