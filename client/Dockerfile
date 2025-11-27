FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Создаем папку для логов если её нет
RUN mkdir -p /app/logs

# Запускаем приложение
CMD ["npm", "run", "start:prod"]

