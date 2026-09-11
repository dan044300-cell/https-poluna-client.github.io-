# Poluna Server — запуск онлайн

Сервер без зависимостей (только Node.js). Слушает порт из `PORT` (по умолчанию 3000)
и открыт на `0.0.0.0`. CORS уже разрешён для любых источников.

## Локальный запуск
```
node server.js
```
- Админка: `http://localhost:3000/admin`
- Админ-токен печатается в консоли (или задаётся переменной `ADMIN_TOKEN`).
- Данные хранятся в `users.json`, `keys.json`, `admin.json` рядом с сервером.

## Деплой на Render (бесплатно, без карты)
1. Залей папку `server` в GitHub-репозиторий.
2. На https://render.com → **New → Web Service**, подключи репозиторий.
3. Build Command: оставить пустым.
4. Start Command: `node server.js`.
5. Render сам задаст переменную `PORT` (её не создавай руками).
6. После деплоя сервер будет доступен по адресу вида `https://poluna-server.onrender.com`.
   Админка — тот же адрес + `/admin`. Токен: задай сразу в Env Variables как `ADMIN_TOKEN`
   (или посмотри в логах деплоя).

## Подключение с сайта и из лаунчера
Сайт выбирает сервер автоматически: на `localhost` — `http://localhost:3000`,
на любом хостинге — `https://poluna-server.onrender.com` (замени этот адрес в
`website/script.js`, строка `SERVER_URL`, если хостинг другой).
- Лаунчер: положи рядом с `Launcher.exe` файл `server.url`, содержащий одну строку
  `https://poluna-server.onrender.com` (переменная `POLUNA_SERVER` имеет приоритет, пересобирать не нужно).

## Проверка, что онлайн-сервер жив
```
curl https://poluna-server.onrender.com/api/health
```
Ответ: `ok`.

Внимание: бесплатные хосты уводят сервис в сон после ~15 минут простоя —
первый запрос после сна может занять 30–60 секунд. Есть альтернативы: Railway,
Koyeb, Fly.io (те же шаги: запуск `node server.js`, порт через `PORT`).