# ==========================================
# Stage 1: Build React 19 + Vite Frontend
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund

# Copy frontend source and build production bundle (v4.5 Multi-Device Responsive UI & Zero Overlap)
COPY client/ ./
ENV VITE_GOOGLE_CLIENT_ID=966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com
RUN npm run build

# ==========================================
# Stage 2: Production Node.js + Express Server
# ==========================================
FROM node:22-alpine

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV GOOGLE_CLIENT_ID=966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com
EXPOSE 10000 5000

CMD ["node", "server.js"]
