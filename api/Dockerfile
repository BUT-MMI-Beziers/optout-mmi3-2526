FROM node:22.22.2-alpine
WORKDIR /app

COPY package*.json ./

RUN npm config set fund false && \
    npm config set update-notifier false

RUN NODE_OPTIONS="--max-old-space-size=512" npm ci --prefer-offline

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]