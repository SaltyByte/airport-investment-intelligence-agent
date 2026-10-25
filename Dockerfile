FROM node:24-slim
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter web build
ENV NODE_ENV=production SERVER_PORT=8080
EXPOSE 8080
WORKDIR /app/apps/server
CMD ["node", "--import", "tsx", "src/main.ts"]
