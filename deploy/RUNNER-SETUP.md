# Установка self-hosted раннера GitHub Actions

Разовая настройка. Делается на рабочей машине в LAN (`BSQL`, Windows Server), с которой
есть доступ к серверу `192.168.33.3`.

## Зачем именно self-hosted

`192.168.33.3` — приватный адрес внутри LAN. Облачные раннеры GitHub (`ubuntu-latest`)
до него не достучатся в принципе, а публичный SSH сервера закрыт: порт `22` снаружи не
отвечает, `50222` проброшен для соседнего сайта `yesbeat.ru`.

Поэтому деплой гоняет раннер на машине, которая в этой же сети. Бонусом: SSH-пароль
не нужен вовсе — ключ лежит локально и в секреты GitHub не попадает.

`tests.yml` при этом остаётся на облачном раннере — ему сервер не нужен.

## 1. Ключ для SSH

Пара уже сгенерирована на машине:

```
~/.ssh/formulaedi_deploy       ← приватный, остаётся здесь, никуда не копируется
~/.ssh/formulaedi_deploy.pub   ← публичный, уезжает на сервер
```

Публичный ключ надо добавить на сервере в `~/.ssh/authorized_keys` того пользователя,
под которым деплоим:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIInj9edtLLcXhVX1lVALkdCz2IcVhR4WuJ8R7fgNlONw formulaedi-deploy@github-runner' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Проверка с этой машины:

```bash
ssh -i ~/.ssh/formulaedi_deploy -p 22 <USER>@192.168.33.3 'whoami; hostname'
```

## 2. Регистрация раннера

Нужны права **Admin** на репозитории `n1ghtmare-dev/formulaedi` (Write недостаточно).

1. GitHub → репозиторий → **Settings** → **Actions** → **Runners** → **New self-hosted runner** → **Windows**.
2. Скопировать `--token` из показанной команды (живёт 1 час).
3. На машине, в PowerShell:

```powershell
mkdir C:\actions-runner; cd C:\actions-runner
$v = "2.322.0"
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v$v/actions-runner-win-x64-$v.zip" -OutFile runner.zip
Expand-Archive -Path runner.zip -DestinationPath . -Force

.\config.cmd --url https://github.com/n1ghtmare-dev/formulaedi `
             --token <ТОКЕН> `
             --name bsql-formulaedi `
             --labels self-hosted,windows,formulaedi `
             --work _work `
             --runasservice
```

Метки `self-hosted,windows,formulaedi` обязаны совпадать с `runs-on` в
[deploy.yml](../.github/workflows/deploy.yml) — иначе джоб будет вечно висеть в очереди.

4. Проверить, что служба поднялась:

```powershell
Get-Service 'actions.runner.*' | Select-Object Name, Status
```

В GitHub → Settings → Actions → Runners раннер должен гореть зелёным `Idle`.

## 3. Секреты репозитория

Settings → Secrets and variables → Actions → New repository secret:

| Секрет | Значение |
|---|---|
| `PROD_SSH_HOST` | `192.168.33.3` |
| `PROD_SSH_PORT` | `22` |
| `PROD_SSH_USER` | `formulaedi` (пользователь сайта в FastPanel) |
| `PROD_DEPLOY_PATH` | `/var/www/formulaedi/data/app` |

Путь — это **репозиторий**, а не document root сайта. Наружу Nginx отдаёт только
`.../app/apps/web/dist`; сам репозиторий с `.env` и `.git` по HTTP недоступен.

Адрес и путь держим в секретах, потому что репозиторий **публичный** — внутреннюю
топологию сети наружу не светим.

Приватный ключ в секреты **не кладём** — он и так на раннере.

## 4. Требования к машине с раннером

- Node 20+ и git — есть.
- `ssh` — есть (`C:\Windows\System32\OpenSSH\ssh.exe`).
- Bash — из состава Git for Windows; воркфлоу используют `shell: bash`.
- Машина должна быть включена в момент деплоя. Раннер стоит службой, поэтому переживает
  перезагрузку.

## Грабли

- **Перевод строк.** На Windows `core.autocrlf=true`, и без [.gitattributes](../.gitattributes)
  скрипты в `deploy/` приезжали бы в рабочую копию с CRLF. Они уходят на Linux через
  `ssh 'bash -s'` — с CRLF bash падает с `\r: command not found`. Правило `*.sh text eol=lf`
  это закрывает; трогать его не надо.
- **Метки раннера.** Опечатка в labels = джоб в очереди навсегда, без внятной ошибки.
- **Соседний прод.** На `192.168.33.3` живёт боевой `yesbeat.ru` с ~20 ТБ медиа.
  Все скрипты работают строго внутри `PROD_DEPLOY_PATH`. Ничего с `--delete` и ничего
  за пределами каталога.
