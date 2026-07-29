#!/bin/sh
set -eu

STEAMCMD_DIR="${STEAMCMD_DIR:-/opt/steamcmd}"
PZ_WORKSHOP_APP_ID="${PZ_WORKSHOP_APP_ID:-108600}"
PZ_MODS_STEAM_HOME="${PZ_MODS_STEAM_HOME:-/data/.gamepanel/steamcmd}"
LOG_PREFIX="[pz-mods]"

. /app/common.sh

STEAMCMD_BIN="${STEAMCMD_DIR}/steamcmd.sh"

logerr() {
  printf '%s %s\n' "${LOG_PREFIX}" "$*" >&2
}

[ "$#" -ge 1 ] || die "resolve-mods.sh requires at least one Steam Workshop id"
[ -x "${STEAMCMD_BIN}" ] || die "SteamCMD executable not found: ${STEAMCMD_BIN}"

for wid in "$@"; do
  case "${wid}" in
    ""|*[!0-9]*) die "Invalid Steam Workshop id: ${wid}" ;;
  esac
done

IDS="$*"

mkdir -p "${PZ_MODS_STEAM_HOME}"
export HOME="${PZ_MODS_STEAM_HOME}"

set -- +login anonymous
for wid in ${IDS}; do
  set -- "$@" +workshop_download_item "${PZ_WORKSHOP_APP_ID}" "${wid}"
done
set -- "$@" +quit

logerr "Downloading workshop items (${PZ_WORKSHOP_APP_ID}): ${IDS}"
"${STEAMCMD_BIN}" "$@" >&2 || logerr "SteamCMD exited non-zero (continuing; results are read from disk)."

for wid in ${IDS}; do
  find "${PZ_MODS_STEAM_HOME}" "${STEAMCMD_DIR}" \
    -path "*/content/${PZ_WORKSHOP_APP_ID}/${wid}/*" -name mod.info 2>/dev/null \
  | sort \
  | while IFS= read -r info; do
      grep -m1 '^id=' "${info}" 2>/dev/null | sed 's/^id=//'
    done \
  | tr -d '\r' \
  | awk -v wid="${wid}" '
      { gsub(/^[ \t]+|[ \t]+$/, "") }
      $0 != "" && index($0, ";") == 0 && !seen[$0]++ { print wid "\t" $0 }
    '
done

find "${PZ_MODS_STEAM_HOME}" "${STEAMCMD_DIR}" -type d -path "*/steamapps/workshop" -prune -exec rm -rf {} + 2>/dev/null || true
