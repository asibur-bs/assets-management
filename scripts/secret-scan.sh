#!/usr/bin/env bash
# Dependency-free secret scan. Lefthook and GitHub Actions both call this file.
# A hit prints only path, line number, and rule id. The matched text is never printed.
set -eu

diff_file=$(mktemp)
trap 'rm -f "$diff_file"' EXIT

write_diff() {
  if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    local base=""
    if [ -n "${GITHUB_BASE_REF:-}" ] && git rev-parse --verify --quiet "refs/remotes/origin/${GITHUB_BASE_REF}" >/dev/null; then
      base="origin/${GITHUB_BASE_REF}"
    elif git rev-parse --verify --quiet 'HEAD~1' >/dev/null; then
      base='HEAD~1'
    else
      echo 'secret-scan: git cannot produce the diff' >&2
      exit 1
    fi
    if ! git diff "$base" >"$diff_file"; then
      echo 'secret-scan: git cannot produce the diff' >&2
      exit 1
    fi
    return 0
  fi
  if ! git diff --cached >"$diff_file"; then
    echo 'secret-scan: git cannot produce the diff' >&2
    exit 1
  fi
}

write_diff

hits=0
file_path=''
new_file=0
in_hunk=0
new_line=0

report() {
  printf '%s:%s:%s\n' "$1" "$2" "$3"
  hits=1
}

is_secret_filename() {
  case "$1" in
    *.pem | *.key | *.env | .env | */.env) return 0 ;;
    *) return 1 ;;
  esac
}

while IFS= read -r line || [ -n "${line:-}" ]; do
  line=${line%$'\r'}
  case "$line" in
    'diff --git '*)
      file_path=''
      new_file=0
      in_hunk=0
      ;;
    'new file mode '* | '--- /dev/null')
      new_file=1
      ;;
    'rename to '* | 'copy to '*)
      dest=${line#* to }
      dest=${dest#\"}
      dest=${dest%\"}
      if is_secret_filename "$dest"; then
        report "$dest" 1 'added-secret-file'
      fi
      ;;
    '+++ '*)
      file_path=${line#'+++ '}
      file_path=${file_path#b/}
      if [ "$new_file" -eq 1 ] && is_secret_filename "$file_path"; then
        report "$file_path" 1 'added-secret-file'
      fi
      new_file=0
      ;;
    '@@ '*)
      in_hunk=0
      if [[ "$line" =~ ^@@[[:space:]]-[0-9]+(,[0-9]+)?[[:space:]]\+([0-9]+) ]]; then
        new_line=${BASH_REMATCH[2]}
        in_hunk=1
      fi
      ;;
    *)
      if [ "$in_hunk" -ne 1 ]; then
        continue
      fi
      if [ "${line#'+'}" != "$line" ] && [ "${line#'+++'}" = "$line" ]; then
        content=${line:1}
        if [[ "$content" =~ AKIA[0-9A-Z]{16} ]]; then
          report "$file_path" "$new_line" 'aws-access-key'
        fi
        if [[ "$content" =~ BEGIN[[:space:]](RSA[[:space:]]|OPENSSH[[:space:]]|EC[[:space:]])?PRIVATE[[:space:]]KEY ]]; then
          report "$file_path" "$new_line" 'private-key'
        fi
        new_line=$((new_line + 1))
      elif [ "${line#'-'}" != "$line" ]; then
        :
      elif [ "$line" = '\ No newline at end of file' ]; then
        :
      else
        new_line=$((new_line + 1))
      fi
      ;;
  esac
done <"$diff_file"

if [ "$hits" -ne 0 ]; then
  exit 1
fi
exit 0
