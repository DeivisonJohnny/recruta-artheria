# 1. Base Image - Usando alpine3.19 que é estável para Chromium e OpenSSL
FROM node:20-alpine3.19 AS base

# 2. Dependencies - Instala todas as dependências (incluindo as necessárias para Prisma CLI)
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile --production=false

# 3. Builder
FROM base AS builder
WORKDIR /app

# Instalar OpenSSL necessário para Prisma
RUN apk add --no-cache libc6-compat openssl

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
      openssl \
      libc6-compat

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos do Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia Prisma schema e client gerado
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# --- COMANDO DE INICIALIZAÇÃO ---
CMD ["node", "server.js"]