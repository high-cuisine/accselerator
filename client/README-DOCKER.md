# Log Reader Client - Docker Setup

## Описание

Сервис для чтения логов из указанной папки, разбивки их на batch и отправки на server для анализа безопасности.

## Переменные окружения

- `LOGS_PATH` - путь к папке с логами (по умолчанию: `/app/logs`)
- `SERVER_URL` - URL сервера для отправки логов (по умолчанию: `http://server:3000`)
- `BATCH_SIZE` - размер batch для отправки (по умолчанию: `100`)
- `WATCH_INTERVAL` - интервал проверки логов в миллисекундах (по умолчанию: `5000`)
- `PORT` - порт для client сервиса (по умолчанию: `3001`)
- `OPENAI_API_KEY` - API ключ OpenAI (для server)

## Запуск через Docker Compose

1. Создайте файл `.env` в папке `client`:
```env
LOGS_PATH=./logs
SERVER_URL=http://server:3000
BATCH_SIZE=100
WATCH_INTERVAL=5000
OPENAI_API_KEY=your_openai_api_key_here
```

2. Создайте папку для логов (если используете локальный путь):
```bash
mkdir -p logs
```

3. Запустите через docker-compose:
```bash
cd client
docker-compose up -d
```

## Формат логов

Сервис поддерживает следующие форматы:
- JSON лог (каждая строка - отдельный JSON объект)
- Текстовые логи (стандартный формат с timestamp и level)

### Пример JSON лога:
```json
{"timestamp":"2024-01-01T12:00:00Z","level":"ERROR","message":"Unauthorized access","ip":"192.168.1.1","method":"POST","path":"/admin","statusCode":401}
```

### Пример текстового лога:
```
2024-01-01 12:00:00 [ERROR] Unauthorized access attempt from 192.168.1.1
```

## Структура проекта

```
client/
├── src/
│   └── log-reader/
│       ├── dto/
│       │   └── log-entry.dto.ts
│       ├── services/
│       │   └── log-reader.service.ts
│       └── log-reader.module.ts
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Как это работает

1. Сервис периодически проверяет папку с логами (каждые `WATCH_INTERVAL` миллисекунд)
2. Находит все файлы с расширениями `.log`, `.txt`, `.json`
3. Парсит логи из файлов
4. Разбивает на batch размером `BATCH_SIZE`
5. Отправляет каждый batch на `SERVER_URL/logs/analyze`
6. Выводит результаты анализа в консоль

## Мониторинг

Логи работы сервиса можно посмотреть через:
```bash
docker-compose logs -f client
```

