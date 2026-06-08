FROM node:22.22.2-alpine
WORKDIR /app

COPY package*.json ./

RUN npm config set fund false && \
    npm config set update-notifier false

COPY . .

EXPOSE 5173

CMD sh -c "npm install && npm run dev -- --host"