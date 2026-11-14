#!/usr/bin/env bash
# Keep only the three newest timestamp backup directories under BACKUP_ROOT.
# Called after a successful smoke (security-design Q4), not from the backup step.
set -eu

backup_root=${BACKUP_ROOT:-backups}

if [ ! -d "$backup_root" ]; then
  exit 0
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
