# Poluna — деплой онлайн через GitHub

GitHub Pages позволяет только статичный сайт (HTML/JS) и НЕ может запускать
Node-сервер с базой. Поэтому проект делится на две части, обе привязаны к
одному GitHub-репозиторию:

| Часть | Где живёт | Что делает |
|---|---|---|
| Сайт + лаунчер | GitHub Pages | витрина, регистрация, покупка, скачивание `Launcher.exe` |
| API-сервер (БД, ключи, админка) | Render (деплой из того же репозитория) | проверка входа лаунчера |

---

## Шаг 1. Установи Git (один раз)

В PowerShell:

```powershell
winget install --id Git.Git --source winget --silent --accept-package-agreements --accept-source-agreements
```

Назови себя (обязательно, иначе коммиты не пройдут):

```powershell
git config --global user.name "твой-ник"
git config --global user.email "твоя-почта"
```

## Шаг 2. Создай репозиторий на GitHub

1. Браузер → https://github.com → создай аккаунт (если нет).
2. New repository → имя `poluna-client` (Public или Private) → Create.
3. Ничего не добавляй (README/template не нужны).

## Шаг 3. Залей проект

В PowerShell:

```powershell
cd C:\Users\user\Poluna\Dile\website
git init
git add -A
git commit -m "Poluna client v1"
git branch -M main
git remote add origin https://github.com/ТВОЙ-НИК/poluna-client.git
git push -u origin main
```

Структура: сайт в корне, сервер в `server/` («Root Directory» для Render).

## Шаг 4. Включи сайт на GitHub Pages

1. GitHub → репозиторий → **Settings** → **Pages**.
2. Branch: `main` → папка `/ (root)` → **Save**.
3. Через минуту сайт будет по адресу: `https://ТВОЙ-НИК.github.io/poluna-client/`

## Шаг 5. Деплой сервера на Render (Node-хостинг)

1. https://render.com → New → **Web Service** (аккаунт, карта не нужна).
2. Подключи GitHub и выбери репозиторий `poluna-client`.
3. Заполни:
   - **Root Directory:** `server`
   - **Build Command:** оставить пустым
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. **Environment → New Environment Variable:**
   `ADMIN_TOKEN = poluna-твой-секретный-токен`
   (порт задаётся самим Render — сервер берёт его из `process.env.PORT`).
5. **Create Web Service** → жди деплой (1–2 мин).
6. Имя сервиса задай как `poluna-server`, тогда адрес будет:
   `https://poluna-server.onrender.com`
   Проверка: открой `https://poluna-server.onrender.com/api/health` → ответ `ok`.

## Шаг 6. Пропиши адрес в сайт и лаунчер

- **Сайт:** в `script.js` уже стоит заготовка `https://poluna-server.onrender.com`
  (сайт сам выбирает: на `localhost` — локальный сервер, на хостинге — этот URL).
  Если Render дал другой поддомен — замени строку `SERVER_URL`.
- **Лаунчер:** рядом с `Launcher.exe` положи файл `server.url` с одной строкой
  `https://poluna-server.onrender.com` (без переносов лишних). Пересобирать
  лаунчер не нужно. Либо задай переменную окружения `POLUNA_SERVER`.

## Шаг 7. Зачем нужна админка

Render-приложение пишет БД в файлы (`users.json`, `keys.json`). На бесплатном
плане файлы иногда сбрасываются при перезапуске — для игры этого достаточно,
для «продажи» лучше перейти на платный план с диском.

Работа: админка `https://poluna-server.onrender.com/admin` (токен из шага 5) →
**Generate keys** (создать ключи в пул) → покупатель регистрируется на сайте →
покупка выдаёт ему ключ из пула → в лаунчере: ключ + логин + пароль → вход.

---

## Полезно
- Команды можно выполнить из папки командой
  `powershell -NoProfile -ExecutionPolicy Bypass -File .\server\start-online.ps1`
  только для ЛОКАЛЬНОЙ проверки (`http://localhost:3000`), онлайн так НЕ запускается.
- Бесплатный Render засыпает после ~15 минут без активности: первый запрос
  после простоя занимает 30–60 сек.
- Обновления: `git add -A; git commit -m "..." ; git push` — Render
  передеплоит сам (при включённом Auto-Deploy по умолчанию).