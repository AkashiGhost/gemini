FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer-cached until package.json changes)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy all source files
COPY . .

# Build Next.js (required — server.ts calls app.prepare() which reads .next/)
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# tsx runs server.ts directly (no pre-compilation step)
CMD ["node_modules/.bin/tsx", "server.ts"]
