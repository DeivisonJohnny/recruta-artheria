# 1. Base Image - Usando alpine3.19 que é estável para Chromium e OpenSSL
FROM node:20-alpine3.19 AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pula o download do Chromium local
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Gera o cliente do Prisma
RUN npx prisma generate
RUN yarn build

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# --- INSTALAÇÃO DE DEPENDÊNCIAS DO SISTEMA (Chromium + OpenSSL) ---
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      openssl

# --- INSTALAÇÃO LOCAL DE DEPENDÊNCIAS PRISMA ---
# Não instalamos globalmente para evitar problemas de permissão

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos do Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia o Prisma e node_modules (com binários do Prisma)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

USER nextjs

EXPOSE 3000

# --- COMANDO DE INICIALIZAÇÃO AUTOMÁTICO ---
# 1. Roda migrations pendentes
# 2. Roda o seed (se necessário)
# 3. Inicia o servidor
CMD sh -c "node_modules/.bin/prisma migrate deploy && node_modules/.bin/prisma db seed || true && node server.js"