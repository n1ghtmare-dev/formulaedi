# Установка self-hosted раннера GitHub Actions

Разовая настройка. Раннер ставится **на сам сервер** `192.168.33.3`, под пользователем
`formulaedi`, в его домашний каталог. Root не нужен.

## Зачем self-hosted и почему на сервере

`192.168.33.3` — приватный адрес внутри LAN. Облачные раннеры GitHub (`ubuntu-latest`)
до него не достучатся, а публичный SSH сервера закрыт.

Раннер прямо на сервере даёт максимум простоты: деплой становится локальным — ни SSH,
ни ключей, ни паролей в секретах. Наружу открывать ничего не надо: раннер сам держит
исходящее HTTPS-соединение с GitHub.

`tests.yml` при этом остаётся на облачном раннере — ему сервер не нужен, только npm.

## 1. Регистрация

Нужны права **Admin** на репозитории (Write недостаточно).

1. GitHub → **Settings** → **Actions** → **Runners** → **New self-hosted runner** → **Linux**.
2. Скопировать `--token` из показанной команды (живёт 1 час).
3. На сервере под `formulaedi`:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -sSLo runner.tar.gz \
  https://github.com/actions/runner/releases/download/v2.336.0/actions-runner-linux-x64-2.336.0.tar.gz
tar xzf runner.tar.gz && rm runner.tar.gz

./config.sh --url https://github.com/n1ghtmare-dev/formulaedi \
            --token <ТОКЕН> \
            --name formulaedi-prod \
            --labels self-hosted,linux,formulaedi \
            --work _work \
            --unattended --replace
```

Метки `self-hosted,linux,formulaedi` обязаны совпадать с `runs-on` в
[deploy.yml](../.github/workflows/deploy.yml) — иначе джоб будет вечно висеть в очереди.

## 2. Автозапуск

Штатный `./svc.sh install` ставит systemd-юнит и требует root, которого нет.
Вместо него — `@reboot` в пользовательском crontab (тем же способом поднимается PM2):

```bash
( crontab -l 2>/dev/null; echo "@reboot cd \$HOME/actions-runner && nohup ./run.sh > \$HOME/actions-runner/runner.log 2>&1 &" ) | crontab -
```

Запуск прямо сейчас, не дожидаясь перезагрузки:

```bash
cd ~/actions-runner && nohup ./run.sh > ~/actions-runner/runner.log 2>&1 &
```

Проверка:

```bash
pgrep -af Runner.Listener      # процесс живой
tail -5 ~/actions-runner/runner.log
```

В GitHub → Settings → Actions → Runners раннер должен гореть зелёным `Idle`.

## 3. Секреты репозитория

Settings → Secrets and variables → Actions:

| Секрет | Значение |
|---|---|
| `PROD_DEPLOY_PATH` | `/var/www/formulaedi/data/app` |

Всё. SSH-секреты новому пайплайну не нужны — деплой локальный.

Путь — это **репозиторий**, а не document root сайта. Наружу отдаётся только
собранная витрина, и раздаёт её сам API.

Адрес сервера держим в секрете, потому что репозиторий **публичный** — внутреннюю
топологию сети наружу не светим.

## Грабли

- **Метки раннера.** Опечатка в labels = джоб в очереди навсегда, без внятной ошибки.
- **Раннер не видит nvm.** Он запускается не через login shell, поэтому `node` из
  `~/.nvm` в PATH не попадает. Все скрипты деплоя подгружают nvm сами — трогать это
  не надо. Сам раннер для своих нужд использует встроенный Node, внешний ему не нужен.
- **Соседний прод.** На машине живёт боевой `yesbeat.ru`. У пользователя `formulaedi`
  нет sudo, так что за пределы своего домашнего каталога деплой не дотянется даже при
  ошибке в скрипте.
- **Раннер и деплой — разные каталоги.** Раннер клонирует репозиторий в
  `~/actions-runner/_work/...` (там лежат только скрипты, которыми он работает),
  а разворачивается сайт в `~/app`. Путать их не надо.
