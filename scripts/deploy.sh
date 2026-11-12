#!/bin/bash
# Деплой CRM «ПЕЧАТНИК» на боевой сервер (по образцу PrintCRM).
# Использование: ./scripts/deploy.sh           — миграции + выкладка
#                ./scripts/deploy.sh --check   — только показать, каких миграций нет на проде
#
# Сначала накатываются миграции из supabase/migrations/, которых нет в журнале schema_migrations (027),
# потом выкладывается фронт. Без этого деплой 2026-10-31 увёз код, которому нужна была ненакатанная 025,
# и 01.11 не записывались операции. Упала миграция — деплой останавливается, сайт остаётся прежним.
set -e

# С 2026-11-12 — сервер Selectel, общий с Атмосферой (старый Beget 159.194.213.28 погиб вместе с базой).
SERVER="root@136.234.75.50"
DIR="/opt/pechatnik-web"
SITE="crm.pechatnik-cherkessk.ru"
# Одно ssh-соединение на весь деплой: серию подключений подряд сервер ловит fail2ban'ом
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$HOME/.ssh/cm-pechatnik-%C -o ControlPersist=60 -o ConnectTimeout=15"
# VPN на маке не пускает ssh до сервера — сначала пробуем мимо него, через Wi-Fi (en0)
if ssh -n $SSH_OPTS -o BindInterface=en0 "$SERVER" true 2>/dev/null; then
  SSH_OPTS="$SSH_OPTS -o BindInterface=en0"
fi
# База ПЕЧАТНИКА — контейнер pechatnik-db. НИКОГДА не supabase-db: на этом сервере это база Атмосферы.
PSQL="docker exec -i pechatnik-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

echo "→ миграции"
# -n: ssh не должен съедать stdin того, кто запустил скрипт
applied=$(ssh -n $SSH_OPTS "$SERVER" "$PSQL -tAc 'select name from schema_migrations'") \
  || { echo "✗ Не прочитать журнал schema_migrations — накатить 027 руками (см. CLAUDE.md)"; exit 1; }

missing=""
for f in supabase/migrations/*.sql; do
  name=$(basename "$f")
  # Имя уходит в SQL — пускаем только привычный вид «NNN_имя.sql»
  [[ "$name" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]] || { echo "✗ Странное имя миграции: $name"; exit 1; }
  grep -qx "$name" <<< "$applied" || missing="$missing $name"
done

if [ -z "$missing" ]; then
  echo "  все миграции уже на проде"
elif [ "$1" = "--check" ]; then
  echo "  нет на проде:$missing"
else
  for name in $missing; do
    echo "  накатываю $name"
    # Миграция и запись в журнал — одной транзакцией: упала — не записана, при следующем деплое пойдёт снова
    { cat "supabase/migrations/$name"; echo; echo "insert into schema_migrations (name) values ('$name') on conflict do nothing;"; echo "notify pgrst, 'reload schema';"; } \
      | ssh $SSH_OPTS "$SERVER" "$PSQL --single-transaction -q"
  done
fi
[ "$1" = "--check" ] && exit 0

echo "→ rsync исходников на $SERVER:$DIR"
rsync -az --delete -e "ssh $SSH_OPTS" \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude '.env*' --exclude '*.png' --exclude '*.PNG' --exclude '*.jpg' --exclude '*.pdf' \
  --exclude '.playwright-mcp' \
  ./ "$SERVER:$DIR/"

echo "→ сборка и перезапуск контейнера"
ssh -n $SSH_OPTS "$SERVER" "cd $DIR && docker compose build --quiet && docker compose up -d"

echo "→ проверка"
sleep 3
# Проверяем с самого сервера через Caddy и https: с мака мешает VPN
code=$(ssh -n $SSH_OPTS "$SERVER" "curl -s -o /dev/null -w '%{http_code}' --resolve $SITE:443:127.0.0.1 https://$SITE/")
if [ "$code" = "200" ]; then
  echo "✓ Деплой успешен: https://$SITE/ отвечает 200"
else
  echo "✗ Ошибка: HTTP $code" && exit 1
fi
