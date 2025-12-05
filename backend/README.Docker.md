# Docker - Backend Estofados

Este guia explica como executar o backend usando Docker.

## Pré-requisitos

- Docker instalado
- Docker Compose instalado

## Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e configure as variáveis de ambiente necessárias, especialmente:
   - `JWT_SECRET`: Uma chave secreta com pelo menos 32 caracteres
   - `DATABASE_URL`: URL de conexão com o banco de dados (já configurada para Docker Compose)
   - Outras variáveis conforme necessário

## Executando com Docker Compose (Recomendado)

O Docker Compose inclui o PostgreSQL e o backend:

```bash
# Construir e iniciar os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Parar os serviços
docker-compose down

# Parar e remover volumes (cuidado: apaga dados do banco)
docker-compose down -v
```

## Executando apenas o Backend (sem Docker Compose)

Se você já tem um banco de dados PostgreSQL rodando:

1. Construa a imagem:
```bash
docker build -t estofados-backend .
```

2. Execute o container:
```bash
docker run -d \
  --name estofados-backend \
  -p 3001:3001 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/whatsapp-sessions:/app/whatsapp-sessions \
  estofados-backend
```

## Volumes

O Docker monta os seguintes volumes:
- `uploads`: Para armazenar PDFs gerados
- `whatsapp-sessions`: Para armazenar sessões do WhatsApp

## Migrations

As migrations do Prisma são executadas automaticamente quando o container inicia através do comando `npx prisma migrate deploy`.

## Health Check

O backend possui um endpoint de health check:
```
GET http://localhost:3001/health
```

## Troubleshooting

### Erro de conexão com banco de dados
- Verifique se o PostgreSQL está rodando e acessível
- Confirme que a `DATABASE_URL` está correta
- Verifique os logs: `docker-compose logs postgres`

### Erro de permissões
- Certifique-se de que os diretórios `uploads` e `whatsapp-sessions` existem e têm permissões adequadas

### Rebuild da imagem
```bash
docker-compose build --no-cache backend
docker-compose up -d
```

