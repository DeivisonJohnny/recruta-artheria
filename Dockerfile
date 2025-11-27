# 1. Base Image - FIXAMOS na versão alpine3.19 para estabilidade do Chromium/Puppeteer
FROM node:20-alpine3.19 AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app
# Adiciona libc6-compat necessário para algumas libs nativas
RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock ./
# Instala dependências
RUN yarn --frozen-lockfile

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pula o download do Chromium local (pois usaremos o do Alpine na produção)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Gera o cliente do Prisma
RUN npx prisma generate

# Desabilita telemetria e faz o build (Formato ENV corrigido)
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# 4. Production Runner
FROM base AS runner
WORKDIR /app

# Correção dos formatos de ENV (removeu warnings)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# --- CONFIGURAÇÃO DO PUPPETEER + PRISMA ---
# No Alpine 3.19, o repositório community já vem habilitado e pacotes são estáveis.
# Instalamos o Chromium e suas dependências de fonte, e o openssl comum.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      openssl

# Diz ao Puppeteer onde está o Chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ---------------------------------

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos públicos e estáticos
COPY --from=builder /app/public ./public

# Copia o build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia o schema/migrations do prisma (importante para production)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]