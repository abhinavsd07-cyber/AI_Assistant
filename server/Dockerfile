# Production Dockerfile for Nebula AI Backend Server
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
