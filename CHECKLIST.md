# Чеклист проекта «Голос в текст»

Рабочий список задач по фазам. Статус сверен с кодом на 2026-06-13.

Легенда: `[x]` — сделано и подтверждено в коде · `[ ]` — не начато · `[~]` — частично/есть проблема.

---

## Фаза 1 — MVP (готова)

### Инфраструктура и монорепо
- [x] Монорепо pnpm-workspace (`apps/web`, `apps/worker`, `packages/db`, `services/transcription`)
- [x] Docker Compose: PostgreSQL, Redis, MinIO (+ профиль `app` для web/worker)
- [x] Prisma-схема и клиент `@repo/db`, seed демо-пользователя

### Аутентификация
- [x] NextAuth.js (`apps/web/src/lib/auth.ts`)
- [x] Регистрация (`api/auth/register`) с bcrypt
- [x] Страницы login / register, защита маршрутов через middleware

### Лендинг
- [x] Hero, Features, How-it-works, Pricing, Testimonials, FAQ, CTA, Header, Footer
- [x] Тёмная/светлая тема (next-themes), анимации (Framer Motion)

### Личный кабинет
- [x] Дашборд, история, страница транскрипции с авто-обновлением статуса
- [x] Создание задачи: загрузка файла (presigned PUT в S3/MinIO) и по URL
- [x] Настройки аккаунта

### Транскрибация
- [x] Очередь BullMQ + приоритет для Pro/Business (`lib/queue.ts`)
- [x] Воркер: скачивание (S3 / yt-dlp), FFmpeg, faster-whisper (`services/transcription/transcribe.py`)
- [x] Запись прогресса в БД, списание минут с лимита тарифа

### Экспорт
- [x] TXT (с водяным знаком для Free)
- [x] SRT
- [x] VTT

### Юридические страницы и SEO
- [x] Privacy Policy, Terms of Service, Cookie Policy, Personal Data Consent
- [x] `robots.ts`, `sitemap.ts`

---

## Фаза 2 — Монетизация и расширения (не начата)

### Платежи и подписки
- [ ] Интеграция ЮKassa (создание платежа, webhook подтверждения)
- [ ] Подписки Pro / Business, апгрейд/даунгрейд тарифа из кабинета
- [ ] Биллинг-история, чеки

### Экспорт
- [x] Генерация форматов вынесена в `lib/export-formats.ts` (единый `buildExport`),
      роут `api/transcriptions/[id]/export/route.ts` переведён на него (`runtime = "nodejs"`)
- [x] Экспорт DOCX (`toDocx`, библиотека `docx`): заголовок, метаданные, сегменты с таймкодами
- [x] Экспорт PDF (`toPdf`, `pdf-lib` + `@pdf-lib/fontkit` со встроенным `NotoSans-Regular.ttf`
      для кириллицы): перенос слов, авто-пагинация, цветные таймкоды
- [x] Кнопки DOCX/PDF выводятся в кабинете для Pro/Business (страница транскрипции)
- [x] **Баг закрыт:** запрос DOCX/PDF больше не отдаёт молча TXT — форматы реализованы

### Прочее
- [ ] Редактор транскрипций с синхронизацией воспроизведения аудио
- [ ] Email-уведомления (Resend): готовность транскрипции, биллинг
- [ ] API-ключи для тарифа Business

---

## Фаза 3 — Качество и наблюдаемость (не начата)

- [ ] Аналитика (Яндекс.Метрика / GA4)
- [ ] Sentry (фронт + воркер)
- [ ] E2E-тесты (Playwright)
- [ ] Юнит-тесты ключевой логики (usage, plans, экспорт)
- [ ] Оптимизация производительности и бандла

---

## Фаза 4 — Запуск (не начата)

- [ ] Прод-деплой (web + worker + инфраструктура)
- [ ] Мониторинг и алерты
- [ ] Резервное копирование БД и хранилища
- [ ] Публичный запуск

---

## Известные проблемы / техдолг

- [x] Экспорт DOCX/PDF заявлен в тарифах и реализован (`lib/export-formats.ts`).
- [ ] Нет автоматических тестов — регрессии ловятся только вручную.
- [x] Проект под git (есть история изменений).
- [x] Env не прокидывался в `apps/web` и `packages/db` — dev-quickstart падал с
      `Environment variable not found: DATABASE_URL`. Исправлено: `apps/web/.env.local` и
      `packages/db/.env` — симлинки на корневой `.env`, а `db:seed` переведён на
      `prisma db seed` (грузит env через Prisma CLI и передаёт в seed-процесс). README обновлён.
