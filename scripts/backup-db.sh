#!/usr/bin/env bash
# Копия базы ПЕЧАТНИКА на сервере. Лежит там как /opt/backup-pechatnik-db.sh,
# запускается каждый час из /etc/cron.d/pechatnik-backup:
#   30 * * * * root /opt/backup-pechatnik-db.sh >> /var/log/pechatnik-backup.log 2>&1
# Копии: /opt/backups/pechatnik/pechatnik-db-*.dump.gz, хранятся KEEP_DAYS дней.
# Раз в сутки их забирает на мак scripts/pull-backup-mac.sh: Beget 2026-11 показал,
# что копия на том же сервере погибает вместе с ним.
#
# Восстановить: gunzip -c файл | docker exec -i pechatnik-db pg_restore -U supabase_admin -d postgres --clean --if-exists
set -euo pipefail

BACKUP_DIR=/opt/backups/pechatnik
CONTAINER=pechatnik-db   # НЕ supabase-db: на этом сервере это база Атмосферы
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

file="$BACKUP_DIR/pechatnik-db-$(date +%F_%H-%M-%S).dump.gz"
# supabase_admin — чтобы в копию попала и схема auth (входы сотрудниц)
docker exec "$CONTAINER" pg_dump -U supabase_admin -Fc postgres | gzip -9 > "$file.tmp"
mv "$file.tmp" "$file"
chmod 600 "$file"
echo "[$(date -Is)] $file ($(du -h "$file" | cut -f1))"

find "$BACKUP_DIR" -type f -name 'pechatnik-db-*.dump.gz' -mtime +"$KEEP_DAYS" -delete
