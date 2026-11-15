#!/usr/bin/env bash
# Stop-then-copy backup. Refuses while src/server.js is still running.
# Copies the database and, when present, the WAL and SHM sidecars.
# Keeps the three newest timestamp directories. Never prints file contents.
set -eu

server_is_running() {
  local entry cmdline
  for entry in /proc/[0-9]*; do
    [ -r "$entry/cmdline" ] || continue
    cmdline=$(tr '\0' ' ' <"$entry/cmdline" 2>/dev/null || true)
    case "$cmdline" in
      *src/server.js*) return 0 ;;
    esac
  done
  return 1
}

if server_is_running; then
  echo 'backup-database: refusing to copy while src/server.js is running' >&2
  exit 1
fi

db_path=${DB_PATH:-data/assets.sqlite}
backup_root=${BACKUP_ROOT:-backups}
stamp=${BACKUP_STAMP:-$(date +%Y%m%d-%H%M%S)}

if ! [[ "$stamp" =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
  echo 'backup-database: BACKUP_STAMP must be YYYYMMDD-HHMMSS' >&2
  exit 1
fi

if [ ! -f "$db_path" ]; then
  echo 'backup-database: database file is missing' >&2
  exit 1
fi

dest="$backup_root/$stamp"
mkdir -p "$dest"
cp -- "$db_path" "$dest/$(basename "$db_path")"
if [ -f "${db_path}-wal" ]; then
  cp -- "${db_path}-wal" "$dest/$(basename "${db_path}-wal")"
fi
if [ -f "${db_path}-shm" ]; then
  cp -- "${db_path}-shm" "$dest/$(basename "${db_path}-shm")"
fi

mapfile -t stamps < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E '^[0-9]{8}-[0-9]{6}$' | sort)
count=${#stamps[@]}
if [ "$count" -gt 3 ]; then
  remove=$((count - 3))
  index=0
  while [ "$index" -lt "$remove" ]; do
    rm -rf -- "$backup_root/${stamps[$index]}"
    index=$((index + 1))
  done
fi
