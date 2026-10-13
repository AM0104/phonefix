#!/usr/bin/env bash
# Публикация сайта PhoneFix в интернет через Cloudflare Tunnel (быстрый туннель).
# Работает без публичного IP, без проброса портов и без настроек на стороне колледжа:
# cloudflared сам подключается наружу и отдаёт сайт по адресу https://<имя>.trycloudflare.com
#
# Запуск на сервере:  sudo bash /var/www/phonefix/deploy/public-url.sh
set -euo pipefail

LOG=/var/log/phonefix-tunnel.log
TARGET="http://localhost:80"

case "$(uname -m)" in
  x86_64|amd64) BIN="cloudflared-linux-amd64" ;;
  aarch64|arm64) BIN="cloudflared-linux-arm64" ;;
  *) echo "Неподдерживаемая архитектура: $(uname -m)"; exit 1 ;;
esac

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "== Скачиваю cloudflared =="
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/${BIN}" -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared --version 2>/dev/null || true

: > "$LOG"

if command -v systemctl >/dev/null 2>&1 && [ "$(ps -p 1 -o comm= 2>/dev/null || echo)" = "systemd" ]; then
  echo "== Ставлю службу автозапуска phonefix-tunnel =="
  cat > /etc/systemd/system/phonefix-tunnel.service <<UNIT
[Unit]
Description=PhoneFix public tunnel (Cloudflare quick tunnel)
After=network-online.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --no-autoupdate --url ${TARGET}
Restart=always
RestartSec=5
StandardOutput=append:${LOG}
StandardError=append:${LOG}

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable phonefix-tunnel >/dev/null 2>&1 || true
  systemctl restart phonefix-tunnel
else
  echo "== systemd недоступен, запускаю туннель в фоне =="
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  nohup /usr/local/bin/cloudflared tunnel --no-autoupdate --url "$TARGET" > "$LOG" 2>&1 &
fi

echo "== Жду публичный адрес =="
URL=""
for _ in $(seq 1 30); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 2
done

echo
if [ -n "$URL" ]; then
  echo "==========================================================="
  echo "  САЙТ ДОСТУПЕН В ИНТЕРНЕТЕ:"
  echo "  $URL"
  echo "==========================================================="
  echo "  Ссылка временная: после перезапуска туннеля она сменится."
  echo "  Проверить: curl -s -o /dev/null -w '%{http_code}\\n' $URL"
  echo "  Лог:       tail -f $LOG"
  echo "  Остановить: systemctl stop phonefix-tunnel"
else
  echo "Не удалось получить адрес за минуту. Последние строки лога:"
  tail -n 20 "$LOG" 2>/dev/null || true
  echo
  echo "Если в логе ошибка сети — попробуйте ещё раз: cloudflared tunnel --url $TARGET"
fi