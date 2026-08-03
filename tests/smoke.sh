#!/usr/bin/env bash
#
# tests/smoke.sh — HTTP smoke-набор для «Формулы Еды».
#
# Проверяет, что после деплоя сайт реально живой:
#   1) витрина (SPA) отдаётся и это не пустой/обрезанный ответ;
#   2) API отвечает на /api/health;
#   3) ключевые API-эндпоинты возвращают ожидаемый код;
#   4) в ответах нет признаков упавшего бэкенда (502/504, стектрейсы Node).
#
# Использование:
#   tests/smoke.sh [BASE_URL]
#   BASE_URL=http://192.168.33.3 tests/smoke.sh
#
# Переменные окружения:
#   BASE_URL   базовый адрес (можно первым аргументом). По умолчанию https://formulaedi.ru
#   HOST_HDR   значение заголовка Host — когда ходим по IP, а не по домену
#              (напр. HOST_HDR=formulaedi.ru BASE_URL=http://192.168.33.3)
#   INSECURE   1 -> curl -k (самоподписанный сертификат)
#   TIMEOUT    таймаут одного запроса, сек (по умолчанию 15)
#   MIN_LEN    минимальная длина тела витрины в байтах (по умолчанию 500)
#
# Код выхода: 0 — все проверки прошли; 1 — хотя бы одна упала.

set -u

BASE_URL="${1:-${BASE_URL:-https://formulaedi.ru}}"
BASE_URL="${BASE_URL%/}"
TIMEOUT="${TIMEOUT:-15}"
MIN_LEN="${MIN_LEN:-500}"

CURL_OPTS=(-s -L --max-time "$TIMEOUT")
[ "${INSECURE:-}" = "1" ] && CURL_OPTS+=(-k)
[ -n "${HOST_HDR:-}" ] && CURL_OPTS+=(-H "Host: ${HOST_HDR}")

# Признаки того, что бэкенд лежит или сыпет ошибками наружу
ERR_RE='Cannot GET /|<title>50[0-9]|Internal Server Error|at [A-Za-z]+\.[A-Za-z]+ \(/|node_modules/@nestjs|PrismaClientKnownRequestError|ECONNREFUSED'

pass=0; fail=0

# check <описание> <path> <ожидаемые коды> <тип: html|json|any> [мин.длина] [маркер в теле]
#
# Тип ответа проверяем обязательно. Иначе получаем ложные «OK»: если Nginx настроен
# неверно и отдаёт index.html вообще на всё, то /api/health вернёт 200 с HTML внутри —
# и проверка «код 200» это радостно засчитает, хотя API мёртв.
check() {
  local desc="$1" path="$2" expected="$3" want_type="$4" minlen="${5:-0}" marker="${6:-}"
  local url="$BASE_URL$path" tmp code len ctype

  tmp="$(mktemp)"
  read -r code ctype <<EOF
$(curl "${CURL_OPTS[@]}" -o "$tmp" -w '%{http_code} %{content_type}' "$url" 2>/dev/null)
EOF
  len="$(wc -c < "$tmp" | tr -d ' ')"

  local ok=1 why=""
  case " $expected " in *" $code "*) ;; *) ok=0; why="$why код=$code (ждали: $expected);";; esac

  case "$want_type" in
    json)
      case "$ctype" in
        *json*) ;;
        *) ok=0; why="$why ответ не JSON (Content-Type: ${ctype:-нет}) — похоже, Nginx отдал витрину вместо API;";;
      esac
      ;;
    html)
      case "$ctype" in
        *html*) ;;
        *) ok=0; why="$why ответ не HTML (Content-Type: ${ctype:-нет});";;
      esac
      ;;
  esac
  if [ "$minlen" -gt 0 ] && [ "$len" -lt "$minlen" ]; then
    ok=0; why="$why тело $len б < $minlen б;"
  fi
  if grep -qiE "$ERR_RE" "$tmp" 2>/dev/null; then
    ok=0; why="$why в ответе следы ошибки бэкенда;"
  fi
  if [ -n "$marker" ] && ! grep -qF "$marker" "$tmp" 2>/dev/null; then
    ok=0; why="$why нет маркера «$marker»;"
  fi

  if [ "$ok" = 1 ]; then
    printf '  OK   %-42s %s (%s б)\n' "$desc" "$code" "$len"
    pass=$((pass+1))
  else
    printf '  FAIL %-42s %s\n' "$desc" "$why"
    echo "       url: $url"
    sed -n '1,5p' "$tmp" | sed 's/^/       | /'
    fail=$((fail+1))
  fi
  rm -f "$tmp"
}

echo "== smoke: $BASE_URL ${HOST_HDR:+(Host: $HOST_HDR)}"

# Витрина: собранный Vite отдаёт index.html с корневым div. Маркер важен — он отличает
# наш деплой от чужой заглушки, которую Nginx может отдавать на этот домен.
check "витрина /"                    "/"            "200"     html "$MIN_LEN" '<div id="root">'

# SPA-роутинг: внутренний путь тоже должен отдать index.html (try_files), а не 404 от Nginx.
check "SPA-роут /menu"               "/menu"        "200"     html "$MIN_LEN" '<div id="root">'

# API живой. Ответ обязан быть JSON — если прилетит HTML, значит проксирование /api не работает.
check "API /api/health"              "/api/health"  "200"     json

# Публичное меню — основной эндпоинт витрины
check "API /api/menu"                "/api/menu"    "200 304" json

# Закрытый эндпоинт без токена обязан ответить 401/403, а не 500 и не 200
check "API /api/orders (без токена)" "/api/orders"  "401 403" json

echo "== итог: OK=$pass FAIL=$fail"
[ "$fail" -eq 0 ] || exit 1
