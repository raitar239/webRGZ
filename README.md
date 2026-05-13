# RVideos

Тестовая видеоплатформа с потоковым воспроизведением и чатом.

## Технологический стек

- **Бэкенд**: Python + Flask + SQLAlchemy + JWT
- **Фронтенд**: React 18 + React Router v6 + Vite
- **БД**: SQLite (для разработки; легко заменить на PostgreSQL)
## Структура проекта

```
video-platform/
├── backend/
│   ├── app.py              # Flask API
│   ├── requirements.txt    # Python зависимости
│   └── uploads/            # Папка для видеофайлов 
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx   # Управление авторизацией
    │   ├── pages/
    │   │   ├── AuthPage.jsx      # Регистрация / Вход
    │   │   ├── WatchPage.jsx     # Плеер + чат
    │   │   └── AdminPage.jsx     # Загрузка / удаление видео
    │   ├── components/
            ├── logo.png
    │   │   └── Logo.jsx          # Логотип
    │   ├── App.jsx               # Роутинг
    │   ├── main.jsx              # Точка входа
    │   └── index.css             # Глобальные стили
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Запуск

### 1. Бэкенд

```bash
cd backend
pip install -r requirements.txt
python app.py
# Сервер запустится на http://localhost:5000
# Автоматически создаётся БД и администратор:
#   email: admin@admin.com
#   пароль: admin123
```

### 2. Фронтенд

```bash
cd frontend
npm install
npm run dev
# Приложение откроется на http://localhost:5173
```

## API Endpoints

| Метод | URL | Описание | Авторизация |
|-------|-----|----------|-------------|
| POST | `/api/register` | Регистрация | — |
| POST | `/api/login` | Вход | — |
| GET | `/api/me` | Текущий пользователь | JWT |
| GET | `/api/videos` | Список видео | — |
| GET | `/api/videos/:id/stream` | Стриминг видео | — |
| GET | `/api/videos/:id/comments` | Комментарии | — |
| POST | `/api/videos/:id/comments` | Добавить комментарий | JWT |
| POST | `/api/comments/:id/like` | Лайк/дизлайк | JWT |
| POST | `/api/admin/videos` | Загрузить видео | JWT (admin) |
| DELETE | `/api/admin/videos/:id` | Удалить видео | JWT (admin) |

## Страницы

- `/watch` — главная: видеоплеер + чат с лайками
- `/auth` — регистрация / вход
- `/admin` — панель администратора (только для admin-пользователей)
