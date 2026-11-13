FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/draw.db
VOLUME /data
EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
