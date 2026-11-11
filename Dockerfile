# ==========================================
# Stage 1: Build React 19 + Vite Frontend
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
ENV VITE_GOOGLE_CLIENT_ID=966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com
RUN npm run build

# ==========================================
# Stage 2: Production Node.js + Express Server
# ==========================================
FROM node:22-alpine

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
