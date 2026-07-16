#!/bin/bash
# Деплой CRM «ПЕЧАТНИК» на боевой сервер (по образцу PrintCRM).
# Использование: ./scripts/deploy.sh
set -e

SERVER="root@159.194.213.28"
DIR="/opt/pechatnik-web"

echo "→ rsync исходников на $SERVER:$DIR"
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude '.env*' --exclude '*.png' --exclude '*.PNG' --exclude '*.jpg' --exclude '*.pdf' \
  --exclude '.playwright-mcp' \
  ./ "$SERVER:$DIR/"

echo "→ сборка и перезапуск контейнера"
ssh "$SERVER" "cd $DIR && docker compose build --quiet && docker compose up -d"

echo "→ проверка"
sleep 3
code=$(curl -s -o /dev/null -w '%{http_code}' http://159.194.213.28/)
if [ "$code" = "200" ]; then
  echo "✓ Деплой успешен: http://159.194.213.28/ отвечает 200"
else
  echo "✗ Ошибка: HTTP $code" && exit 1
fi
