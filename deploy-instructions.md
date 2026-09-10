# Инструкция по размещению сайта на GitHub Pages

## Шаг 1: Установка Git

1. Скачайте Git: https://git-scm.com/download/win
2. Установите, нажимая "Next" на всех шагах

## Шаг 2: Создание репозитория на GitHub

1. Зайдите на https://github.com
2. Создайте аккаунт или войдите
3. Нажмите "+" в правом верхнем углу → "New repository"
4. Название репозитория: `poluna-client.github.io`
   - ВАЖНО: имя репозитория должно быть именно таким
5. Нажмите "Create repository"

## Шаг 3: Загрузка файлов

### Вариант A: Через веб-интерфейс (проще)

1. Откройте созданный репозиторий
2. Нажмите "uploading an existing file"
3. Перетащите файлы из папки `website`:
   - index.html
   - style.css
   - script.js
   - README.md
4. Нажмите "Commit changes"

### Вариант B: Через командную строку

Откройте PowerShell и выполните:

```powershell
# Настройка Git (замените на свои данные)
git config --global user.name "Ваше Имя"
git config --global user.email "ваш@email.com"

# Клонирование репозитория
cd c:\Users\user
git clone https://github.com/YOUR_USERNAME/poluna-client.github.io.git

# Копирование файлов
Copy-Item -Path "c:\Users\user\Poluna\Dile\website\*" -Destination "c:\Users\user\poluna-client.github.io\" -Recurse

# Загрузка на GitHub
cd c:\Users\user\poluna-client.github.io
git add .
git commit -m "Initial website"
git push origin main
```

## Шаг 4: Активация GitHub Pages

1. Откройте репозиторий на GitHub
2. Settings → Pages (в левом меню)
3. Source: выберите "main" branch
4. Folder: "/ (root)"
5. Нажмите "Save"

## Шаг 5: Проверка

Через 1-5 минут сайт будет доступен по адресу:
**https://poluna-client.github.io/**

## Индексация в поиске

### Google Search Console

1. Зайдите на https://search.google.com/search-console
2. Добавьте свойство: `https://poluna-client.github.io/`
3. Подтвердите владение (через GitHub)
4. Отправьте sitemap: `https://poluna-client.github.io/sitemap.xml`

### Яндекс.Вебмастер

1. Зайдите на https://webmaster.yandex.ru/
2. Добавьте сайт: `https://poluna-client.github.io/`
3. Подтвердите владение
4. Отправьте на переобход

## Свой домен (опционально)

Если хотите домен типа `poluna-client.com`:

1. Купите домен на reg.ru, namecheap.com или другом регистраторе
2. В GitHub: Settings → Pages → Custom domain → введите ваш домен
3. У регистратора добавьте DNS записи:
   - CNAME: www → poluna-client.github.io
   - A: @ → 185.199.108.153
   - A: @ → 185.199.109.153
   - A: @ → 185.199.110.153
   - A: @ → 185.199.111.153
