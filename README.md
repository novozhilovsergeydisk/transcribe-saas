# Голос в текст — платформа транскрибации аудио и видео

SaaS-платформа для транскрибации аудио и видеоконтента: загрузка файлов, обработка по URL
(YouTube, Vimeo), экспорт в TXT/SRT/VTT, личный кабинет, тарифы Free/Pro/Business.

## Стек

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, next-themes
- **Backend:** PostgreSQL (нативный SQL через `pg`, своя система миграций), NextAuth.js, Redis + BullMQ
- **Транскрибация:** faster-whisper (локально), yt-dlp, FFmpeg
- **Инфраструктура:** Docker Compose, MinIO (S3)

## Структура монорепо

```
├── apps/
│   ├── web/        # Next.js приложение (лендинг + кабинет + API)
│   └── worker/     # BullMQ-воркер фоновой транскрибации
├── packages/
│   └── db/         # Нативный SQL-слой: пул pg, репозитории, миграции (@repo/db)
├── services/
│   └── transcription/  # Python-скрипт faster-whisper
└── docker-compose.yml  # postgres, redis, minio (+ web/worker по профилю app)
```

## Быстрый старт (разработка)

Требования: Node.js 20+, pnpm 9+, Docker, Python 3.10+ (для воркера), FFmpeg.

```bash
# 1. Зависимости
pnpm install

# 2. Окружение
cp .env.example .env
# при необходимости поправьте значения; для локалки дефолты уже рабочие

# 3. Инфраструктура: PostgreSQL, Redis, MinIO
#    вариант А — через Docker:
docker compose up -d postgres redis minio minio-init
#    вариант Б — нативный PostgreSQL: создайте БД и пропишите DB_* в .env, напр.:
#    createdb -E UTF8 --locale=ru_RU.UTF-8 -T template0 transcribe_saas
#    (локаль ru_RU.UTF-8 нужна для регистронезависимого поиска по кириллице)

# 4. База данных (своя система миграций)
pnpm db:migrate     # применит SQL-миграции из packages/db/migrations
pnpm db:seed        # демо-пользователь demo@example.com / demo1234

# 5. Python-зависимости воркера
pip3 install -r services/transcription/requirements.txt

# 6. Запуск (в двух терминалах)
pnpm dev            # web на http://localhost:3000
pnpm dev:worker     # воркер транскрибации
```

> Все пакеты используют один файл `.env` в корне репозитория. `apps/web/.env.local` — симлинк
> на него (его читает Next). Скрипты `db:migrate`/`db:seed` и воркер сами ищут ближайший `.env`
> вверх по дереву. Если симлинк потерялся: `ln -sf ../../.env apps/web/.env.local`

## Запуск в Docker целиком

```bash
docker compose --profile app up --build
```

## Полезные команды

| Команда | Описание |
| --- | --- |
| `pnpm dev` | dev-сервер Next.js |
| `pnpm dev:worker` | воркер с hot-reload |
| `pnpm build` | сборка всех пакетов |
| `pnpm typecheck` | проверка типов во всех пакетах |
| `pnpm db:migrate` | применить SQL-миграции (`packages/db/migrations`) |
| `pnpm db:seed` | демо-данные (demo@example.com / demo1234) |

## Как устроена транскрибация

1. Пользователь загружает файл (presigned PUT в MinIO/S3) или вставляет URL.
2. `apps/web` создаёт запись `Transcription` и кладёт задачу в очередь BullMQ
   (Pro/Business — приоритет выше).
3. `apps/worker` скачивает исходник (S3 или yt-dlp), запускает
   `services/transcription/transcribe.py` (faster-whisper), пишет прогресс в БД.
4. Результат (текст + сегменты с таймкодами) сохраняется, минуты списываются с лимита
   тарифа, страница транскрипции обновляется автоматически.

## Тарифы

| | Free | Pro | Business |
| --- | --- | --- | --- |
| Минуты/мес | 30 | 600 | безлимит |
| Экспорт | TXT | + DOCX, SRT, VTT, PDF | + API |
| Цена | 0 ₽ | 790 ₽/мес · 7900 ₽/год | 2990 ₽/мес · 29900 ₽/год |

## Дорожная карта

- **Фаза 1 (готово):** монорепо, аутентификация, лендинг, кабинет, загрузка файлов и URL,
  очередь, faster-whisper, экспорт TXT/SRT/VTT, юридические страницы, SEO-базис.
- **Фаза 2:** платежи ЮKassa, подписки, экспорт DOCX/PDF, редактор транскрипций с
  синхронизацией аудио, email-уведомления (Resend), API-ключи.
- **Фаза 3:** аналитика (Метрика/GA4), Sentry, тесты (Playwright), оптимизация.
- **Фаза 4:** деплой, мониторинг, запуск.
