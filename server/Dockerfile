FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
# Используем npm install вместо npm ci, чтобы корректно работать при отсутствии lock-файла
RUN npm install

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Запускаем приложение
CMD ["npm", "run", "start:prod"]

