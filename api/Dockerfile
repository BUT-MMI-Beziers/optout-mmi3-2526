FROM node:22.22.2-alpine
WORKDIR /app

COPY package*.json ./

RUN npm config set fund false && \
    npm config set update-notifier false

RUN npm ci

COPY . .

EXPOSE 3000
CMD sh -c "npm install && npm run dev"