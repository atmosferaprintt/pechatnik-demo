#!/bin/bash
# Раз в сутки забирает на мак последнюю копию базы ПЕЧАТНИКА с сервера 136.234.75.50.
# Рабочая копия скрипта — ~/Pechatnik-backups/pull.sh, её запускает launchd
# (~/Library/LaunchAgents/ru.pechatnik.backup.plist, каждый день в 21:45).
# Копии — ~/Pechatnik-backups/db/, последние 30 штук. Не скачалось — уведомление на маке.
set -uo pipefail

HOST=136.234.75.50
ROOT="$HOME/Pechatnik-backups"
LOG="$ROOT/pull.log"
mkdir -p "$ROOT/db"
chmod 700 "$ROOT"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }
fail() {
  log "ОШИБКА: $*"
  osascript -e "display notification \"$*\" with title \"Копия ПЕЧАТНИКА не скачалась\"" >/dev/null 2>&1
  exit 1
}

BASE=(-i "$HOME/.ssh/id_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o StrictHostKeyChecking=accept-new)

# VPN не пропускает ssh до сервера, поэтому сначала идём мимо него через Wi-Fi
SSH_OPTS=()
for candidate in "-o BindInterface=en0" ""; do
  # shellcheck disable=SC2206
  try=("${BASE[@]}" $candidate)
  if /usr/bin/ssh "${try[@]}" "root@$HOST" true 2>/dev/null; then
    SSH_OPTS=("${try[@]}")
    break
  fi
done
[ ${#SSH_OPTS[@]} -gt 0 ] || fail "сервер $HOST не отвечает"

latest=$(/usr/bin/ssh "${SSH_OPTS[@]}" "root@$HOST" 'ls -t /opt/backups/pechatnik/pechatnik-db-*.dump.gz | head -1') || fail "не удалось узнать последнюю копию"
[ -n "$latest" ] || fail "на сервере нет копий базы"

name=$(basename "$latest")
/usr/bin/rsync -az -e "/usr/bin/ssh ${SSH_OPTS[*]}" "root@$HOST:$latest" "$ROOT/db/$name.part" || fail "не скачалась копия $name"
/usr/bin/gzip -dc < "$ROOT/db/$name.part" > /dev/null || { rm -f "$ROOT/db/$name.part"; fail "копия $name повреждена"; }
mv "$ROOT/db/$name.part" "$ROOT/db/$name"
chmod 600 "$ROOT/db/$name"

ls -t "$ROOT"/db/pechatnik-db-*.dump.gz | tail -n +31 | while read -r old; do rm -f "$old"; done

log "ок: $name, $(du -h "$ROOT/db/$name" | cut -f1); копий $(ls "$ROOT"/db/*.dump.gz | wc -l | tr -d ' ')"
