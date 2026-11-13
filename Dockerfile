FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/draw.db
VOLUME /data
EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
