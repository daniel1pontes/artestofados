# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine AS production

WORKDIR /app

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar arquivos compilados e Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Criar diretório para uploads
RUN mkdir -p uploads/pdfs whatsapp-sessions

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Expor porta
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

