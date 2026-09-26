FROM node:24-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS migrate-deps
WORKDIR /migrate

COPY package-lock.json ./
RUN node -e " \
      const lock = require('./package-lock.json').packages; \
      const dependencies = Object.fromEntries(['prisma', 'pg', 'dotenv'].map(name => [name, lock['node_modules/' + name].version])); \
      require('fs').writeFileSync('package.json', JSON.stringify({ private: true, dependencies, allowScripts: { prisma: true, '@prisma/engines': true } })); \
    " \
 && npm install --omit=dev --no-audit --no-fund --no-package-lock

FROM deps AS builder

COPY . .

RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV CHECKPOINT_DISABLE=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=migrate-deps /migrate/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma.config.mjs /app/start.sh ./
COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
VOLUME ["/app/uploads"]

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NOTES_UPLOADS_DIR=/app/uploads

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/login || exit 1

CMD ["./start.sh"]
