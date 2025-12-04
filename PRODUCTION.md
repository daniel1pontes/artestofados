# Guia de Deploy em Produção

Este documento contém instruções para preparar e fazer o deploy do sistema em produção.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 16+ configurado
- Servidor com acesso SSH
- Domínio configurado (opcional, mas recomendado)

## 🔧 Configuração do Ambiente

### 1. Variáveis de Ambiente

#### Backend

Crie um arquivo `.env` na pasta `backend/` com base no `.env.example`:

```bash
cd backend
cp .env.example .env
```

Configure as seguintes variáveis obrigatórias:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/estofados?schema=public
JWT_SECRET=seu-secret-jwt-muito-seguro-minimo-32-caracteres
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://seu-dominio.com
```

Variáveis opcionais:

```env
OPENAI_API_KEY=sua-chave-openai (se usar chatbot com IA)
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-credentials-account.json (se usar Google Calendar)
WHATSAPP_SESSION_PATH=./whatsapp-sessions
```

#### Frontend

Crie um arquivo `.env` na pasta `frontend/`:

```bash
cd frontend
cp .env.example .env
```

Configure:

```env
VITE_API_URL=http://srv1082164.hstgr.cloud/api
```

### 2. Credenciais do Google Calendar (Opcional)

Se você usar integração com Google Calendar:

1. Coloque o arquivo `google-credentials-account.json` na pasta `backend/`
2. Configure a variável `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` no `.env`

**⚠️ IMPORTANTE:** Este arquivo contém credenciais sensíveis e NÃO deve ser commitado no Git.

## 🏗️ Build do Projeto

### 1. Instalar Dependências

```bash
# Na raiz do projeto
npm install

# Ou manualmente:
cd backend && npm install --production
cd ../frontend && npm install
```

### 2. Build do Backend

```bash
cd backend
npm run build
```

Isso irá:
- Compilar o TypeScript para JavaScript
- Gerar os tipos do Prisma
- Criar a pasta `dist/` com os arquivos compilados

### 3. Build do Frontend

```bash
cd frontend
npm run build
```

Isso irá:
- Compilar e otimizar o React
- Minificar os arquivos
- Criar a pasta `dist/` com os arquivos estáticos

## 🗄️ Configuração do Banco de Dados

### 1. Executar Migrações

```bash
cd backend
npx prisma migrate deploy
```

Isso aplicará todas as migrações pendentes no banco de dados de produção.

### 2. (Opcional) Popular Dados Iniciais

```bash
cd backend
npm run prisma:seed
```

## 🚀 Deploy

### Opção 1: Usando PM2 (Recomendado)

1. Instalar PM2 globalmente:

```bash
npm install -g pm2
```

2. Iniciar o servidor:

```bash
cd backend
pm2 start dist/server.js --name estofados-backend
```

3. Configurar PM2 para iniciar automaticamente:

```bash
pm2 startup
pm2 save
```

### Opção 2: Usando systemd (Linux)

Crie um arquivo `/etc/systemd/system/estofados.service`:

```ini
[Unit]
Description=Estofados Backend
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/artestofados/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Ative o serviço:

```bash
sudo systemctl enable estofados
sudo systemctl start estofados
```

### Opção 3: Usando Docker

Crie um `Dockerfile` na raiz do backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

Build e execute:

```bash
docker build -t estofados-backend ./backend
docker run -d -p 3001:3001 --env-file ./backend/.env estofados-backend
```

## 🌐 Servir o Frontend

### Opção 1: Nginx

Configure o Nginx para servir os arquivos estáticos:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    root /caminho/para/artestofados/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opção 2: Servir com Express (Desenvolvimento)

Para desenvolvimento, você pode servir o frontend através do Express adicionando:

```typescript
import path from "path";

if (config.nodeEnv === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}
```

## 🔒 Segurança

### Checklist de Segurança

- [ ] Variáveis de ambiente configuradas e seguras
- [ ] JWT_SECRET com pelo menos 32 caracteres aleatórios
- [ ] HTTPS configurado (usando Let's Encrypt)
- [ ] CORS configurado apenas para o domínio de produção
- [ ] Firewall configurado (portas 80, 443, 22 abertas)
- [ ] Credenciais do Google não commitadas no Git
- [ ] Banco de dados com senha forte
- [ ] Backups automáticos configurados

### Configurar HTTPS com Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

## 📊 Monitoramento

### Logs

Os logs são gerados em formato JSON. Para visualizar:

```bash
# Com PM2
pm2 logs estofados-backend

# Com systemd
journalctl -u estofados -f
```

### Health Check

Adicione uma rota de health check:

```typescript
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
```

## 🔄 Atualizações

Para atualizar o sistema em produção:

1. Fazer backup do banco de dados
2. Fazer pull das alterações
3. Instalar novas dependências: `npm install`
4. Executar migrações: `npm run prisma:migrate:deploy`
5. Rebuild: `npm run build`
6. Reiniciar o servidor: `pm2 restart estofados-backend` ou `sudo systemctl restart estofados`

## 🐛 Troubleshooting

### Erro de conexão com banco de dados

- Verifique se o PostgreSQL está rodando
- Verifique a string de conexão no `.env`
- Verifique se o firewall permite conexões na porta 5432

### Erro de CORS

- Verifique se `FRONTEND_URL` está configurado corretamente
- Verifique se o frontend está acessando a URL correta da API

### WhatsApp não conecta

- Verifique se a pasta `whatsapp-sessions` existe e tem permissões de escrita
- Verifique os logs para mais detalhes

## 📞 Suporte

Em caso de problemas, verifique:
1. Logs do servidor
2. Logs do banco de dados
3. Variáveis de ambiente
4. Configurações de firewall

