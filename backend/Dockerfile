# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Instalar dependências
RUN npm ci

# Copiar código fonte (excluindo .env)
COPY . .
RUN rm -f .env .env.local .env.*.local 2>/dev/null || true

# Copiar logo do frontend se existir (para desenvolvimento local)
# Em produção, a logo deve ser copiada via volume ou estar no diretório assets
RUN mkdir -p assets/images && \
    if [ -f ../frontend/public/images/logo.png ]; then \
      cp ../frontend/public/images/logo.png assets/images/logo.png; \
    fi || true

# Gerar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências necessárias para Prisma e verificação de banco
RUN apk add --no-cache openssl postgresql-client

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar arquivos compilados e Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar assets (logo) se existir no builder
COPY --from=builder /app/assets ./assets

# Criar diretório para uploads e assets
RUN mkdir -p uploads/pdfs whatsapp-sessions assets/images

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001
# DATABASE_URL será definida pelo docker-compose.yml

# Expor porta
EXPOSE 3001

# Comando para iniciar o servidor com migrations
CMD sh -c '\
  echo "🔍 Environment check:" && \
  echo "DATABASE_URL=$DATABASE_URL" && \
  echo "NODE_ENV=$NODE_ENV" && \
  echo "" && \
  if [ -z "$DATABASE_URL" ]; then \
    echo "❌ ERROR: DATABASE_URL is not set!" && \
    exit 1; \
  fi && \
  rm -f /app/.env /app/.env.local /app/.env.*.local 2>/dev/null || true && \
  rm -rf /app/node_modules/.prisma/.cache 2>/dev/null || true && \
  echo "⏳ Waiting for database to be ready..." && \
  MAX_ATTEMPTS=30 && \
  ATTEMPT=0 && \
  DB_HOST=$(echo "$DATABASE_URL" | sed -E "s/.*@([^:]+).*/\1/") && \
  DB_PORT=$(echo "$DATABASE_URL" | sed -E "s/.*:([0-9]+)\/.*/\1/" | head -1) && \
  DB_USER=$(echo "$DATABASE_URL" | sed -E "s|.*://([^:@]+)(:.*)?@.*|\1|") && \
  DB_PORT=${DB_PORT:-5432} && \
  echo "Checking connection to: $DB_USER@$DB_HOST:$DB_PORT" && \
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do \
    ATTEMPT=$((ATTEMPT + 1)) && \
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then \
      echo "✅ Database is ready!" && \
      break; \
    else \
      if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then \
        echo "❌ Database not available after $MAX_ATTEMPTS attempts" && \
        exit 1; \
      fi && \
      echo "⏳ Waiting for database... (attempt $ATTEMPT/$MAX_ATTEMPTS)" && \
      sleep 2; \
    fi; \
  done && \
  echo "🔄 Running database migrations..." && \
  MIGRATION_SUCCESS=false && \
  for i in 1 2 3 4 5; do \
    echo "Migration attempt $i/5..." && \
    if env DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy --schema=./prisma/schema.prisma; then \
      echo "✅ Migrations completed successfully!" && \
      MIGRATION_SUCCESS=true && \
      break; \
    else \
      if [ $i -eq 5 ]; then \
        echo "⚠️ Migration failed after 5 attempts, starting server anyway..."; \
      else \
        echo "Migration attempt $i failed, retrying in 5 seconds..." && \
        sleep 5; \
      fi; \
    fi; \
  done && \
  if [ "$MIGRATION_SUCCESS" = "true" ]; then \
    echo "🌱 Running database seed..." && \
    if env DATABASE_URL="$DATABASE_URL" node dist/seed.js; then \
      echo "✅ Seed completed successfully!"; \
    else \
      echo "⚠️ Seed failed, but continuing to start server..."; \
    fi; \
  fi && \
  echo "🚀 Starting server..." && \
  exec node dist/server.js'

