# 1. Base Image
FROM node:18-alpine AS base

# 2. Dependencies (Instala pacotes e gera cache)
FROM base AS deps
WORKDIR /app
# Instala compatibilidade necessária para algumas libs
RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock ./
# Instala dependências
RUN yarn --frozen-lockfile

# 3. Builder (Compila o Next e o Prisma)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variável para pular o download do Chromium local (usaremos o do sistema)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Gera o cliente do Prisma (CRÍTICO)
RUN npx prisma generate

# Desabilita telemetria e faz o build
ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn build

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# --- CONFIGURAÇÃO DO PUPPETEER ---
# Instala o Chromium no Alpine Linux para o Puppeteer funcionar
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Diz ao Puppeteer onde está o Chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ---------------------------------

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos públicos e estáticos
COPY --from=builder /app/public ./public

# Copia o build standalone (otimizado)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia o schema do prisma caso precise rodar migrations em runtime (opcional, mas recomendado)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]