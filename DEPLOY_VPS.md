# 🚀 Guia Completo: Deploy em VPS via SSH

Este guia fornece instruções passo a passo para fazer o deploy completo do sistema em uma VPS usando SSH.

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Uma VPS com Ubuntu 20.04+ ou Debian 11+ (recomendado)
- ✅ Acesso SSH à VPS (usuário com permissões sudo)
- ✅ Domínio apontando para o IP da VPS (opcional, mas recomendado)
- ✅ Git configurado localmente
- ✅ Chave SSH configurada para acesso à VPS

---

## 🔐 Passo 1: Conectar na VPS via SSH

### 1.1 Conectar pela primeira vez

```bash
ssh usuario@seu-ip-vps
# Exemplo: ssh root@192.168.1.100
```

Se for a primeira conexão, aceite o fingerprint digitando `yes`.

### 1.2 Verificar informações do sistema

```bash
# Verificar versão do sistema
lsb_release -a

# Verificar espaço em disco
df -h

# Verificar memória
free -h
```

---

## 🛠️ Passo 2: Atualizar o Sistema

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Instalar ferramentas básicas
sudo apt install -y curl wget git build-essential
```

---

## 📦 Passo 3: Instalar Node.js 18+

### 3.1 Instalar Node.js usando NodeSource

```bash
# Baixar e executar script de instalação
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

Você deve ver algo como `v18.x.x` e `9.x.x` ou superior.

---

## 🗄️ Passo 4: Instalar PostgreSQL

### 4.1 Instalar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verificar status do serviço
sudo systemctl status postgresql

# Iniciar PostgreSQL (se não estiver rodando)
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4.2 Configurar banco de dados

```bash
# Acessar PostgreSQL como usuário postgres
sudo -u postgres psql
```

Dentro do PostgreSQL, execute:

```sql
-- Criar banco de dados
CREATE DATABASE estofados;

-- Criar usuário
CREATE USER estofados_user WITH PASSWORD 'sua_senha_segura_aqui';

-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON DATABASE estofados TO estofados_user;

-- Alterar encoding do banco (opcional, mas recomendado)
ALTER DATABASE estofados OWNER TO estofados_user;

-- Sair do PostgreSQL
\q
```

### 4.3 Testar conexão

```bash
# Testar conexão
sudo -u postgres psql -d estofados -c "SELECT version();"
```

---

## 📁 Passo 5: Preparar Estrutura de Diretórios

### 5.1 Criar diretório para o projeto

```bash
# Criar diretório para aplicações
sudo mkdir -p /var/www
cd /var/www

# Criar diretório do projeto
sudo mkdir estofados
sudo chown $USER:$USER estofados
cd estofados
```

### 5.2 Clonar o repositório

**Opção A: Se o código está no Git (recomendado)**

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/artestofados.git .

# Ou se usar SSH:
# git clone git@github.com:seu-usuario/artestofados.git .
```

**Opção B: Se você vai fazer upload manual**

```bash
# No seu computador local, criar um arquivo tar
cd /caminho/do/projeto
tar -czf estofados.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' .

# Fazer upload via SCP (do seu computador local)
scp estofados.tar.gz usuario@seu-ip-vps:/var/www/estofados/

# Na VPS, extrair
cd /var/www/estofados
tar -xzf estofados.tar.gz
rm estofados.tar.gz
```

---

## 🔧 Passo 6: Configurar Variáveis de Ambiente

### 6.1 Configurar Backend

```bash
cd /var/www/estofados/backend

# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
nano .env
```

Configure o arquivo `.env` com os seguintes valores:

```env
NODE_ENV=production
PORT=3001

# Banco de dados - use as credenciais criadas no Passo 4.2
DATABASE_URL=postgresql://estofados_user:sua_senha_segura_aqui@localhost:5432/estofados?schema=public

# JWT - gere uma string aleatória segura (mínimo 32 caracteres)
JWT_SECRET=GERE_UMA_STRING_ALEATORIA_MUITO_SEGURA_AQUI_MINIMO_32_CARACTERES
JWT_EXPIRES_IN=7d

# Frontend URL - use seu domínio ou IP
FRONTEND_URL=https://seu-dominio.com
# Ou se não tiver domínio ainda:
# FRONTEND_URL=http://seu-ip-vps

# WhatsApp (opcional)
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# OpenAI (opcional - se usar chatbot com IA)
OPENAI_API_KEY=sua-chave-openai-aqui

# Google Calendar (opcional)
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-credentials-account.json
```

**💡 Dica:** Para gerar um JWT_SECRET seguro, execute:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salve o arquivo: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6.2 Configurar Frontend

```bash
cd /var/www/estofados/frontend

# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
nano .env
```

Configure:

```env
# URL da API - use seu domínio ou IP da VPS
VITE_API_URL=https://seu-dominio.com/api
# Ou se não tiver domínio ainda:
# VITE_API_URL=http://seu-ip-vps:3001/api
```

Salve o arquivo: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6.3 Upload de credenciais do Google (se necessário)

Se você usar Google Calendar, faça upload do arquivo de credenciais:

```bash
# Do seu computador local
scp backend/google-credentials-account.json usuario@seu-ip-vps:/var/www/estofados/backend/
```

---

## 📦 Passo 7: Instalar Dependências e Build

### 7.1 Instalar dependências do Backend

```bash
cd /var/www/estofados/backend

# Instalar dependências
npm install --production

# Gerar cliente Prisma
npx prisma generate
```

### 7.2 Executar migrações do banco de dados

```bash
# Aplicar migrações
npx prisma migrate deploy

# Verificar se as tabelas foram criadas
sudo -u postgres psql -d estofados -c "\dt"
```

### 7.3 Build do Backend

```bash
# Compilar TypeScript
npm run build

# Verificar se a pasta dist foi criada
ls -la dist/
```

### 7.4 Instalar dependências e build do Frontend

```bash
cd /var/www/estofados/frontend

# Instalar dependências
npm install

# Build para produção
npm run build

# Verificar se a pasta dist foi criada
ls -la dist/
```

---

## 🚀 Passo 8: Configurar PM2 (Gerenciador de Processos)

### 8.1 Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

### 8.2 Iniciar aplicação com PM2

```bash
cd /var/www/estofados/backend

# Iniciar aplicação
pm2 start dist/server.js --name estofados-backend

# Verificar status
pm2 status

# Ver logs
pm2 logs estofados-backend

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
```

Execute o comando que aparecer (algo como `sudo env PATH=...`).

### 8.3 Comandos úteis do PM2

```bash
# Ver logs em tempo real
pm2 logs estofados-backend

# Reiniciar aplicação
pm2 restart estofados-backend

# Parar aplicação
pm2 stop estofados-backend

# Ver informações detalhadas
pm2 info estofados-backend

# Monitorar recursos
pm2 monit
```

---

## 🌐 Passo 9: Configurar Nginx (Servidor Web)

### 9.1 Instalar Nginx

```bash
sudo apt install -y nginx

# Verificar status
sudo systemctl status nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 9.2 Configurar Nginx para o Frontend e API

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/estofados
```

Cole a seguinte configuração:

```nginx
# Redirecionar HTTP para HTTPS (se tiver SSL)
# server {
#     listen 80;
#     server_name seu-dominio.com;
#     return 301 https://$server_name$request_uri;
# }

# Configuração principal
server {
    listen 80;
    # Se tiver domínio, descomente a linha abaixo e use seu domínio
    # server_name seu-dominio.com;
    
    # Se não tiver domínio, comente a linha acima
    
    # Tamanho máximo de upload
    client_max_body_size 50M;

    # Servir arquivos estáticos do frontend
    root /var/www/estofados/frontend/dist;
    index index.html;

    # Frontend - React Router
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

### 9.3 Ativar configuração do Nginx

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/estofados /etc/nginx/sites-enabled/

# Remover configuração padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se tudo estiver OK, recarregar Nginx
sudo systemctl reload nginx
```

### 9.4 Configurar Firewall

```bash
# Verificar status do firewall
sudo ufw status

# Permitir SSH (importante fazer primeiro!)
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar regras
sudo ufw status verbose
```

---

## 🔒 Passo 10: Configurar SSL/HTTPS (Let's Encrypt)

### 10.1 Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 10.2 Obter certificado SSL

**⚠️ IMPORTANTE:** Você precisa ter um domínio apontando para o IP da VPS.

```bash
# Obter certificado (substitua seu-dominio.com pelo seu domínio)
sudo certbot --nginx -d seu-dominio.com

# Ou se tiver www também:
# sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Siga as instruções:
- Digite seu email
- Aceite os termos
- Escolha se quer redirecionar HTTP para HTTPS (recomendado: opção 2)

### 10.3 Atualizar configuração do Nginx para HTTPS

O Certbot já atualiza automaticamente, mas você pode verificar:

```bash
sudo nano /etc/nginx/sites-available/estofados
```

### 10.4 Renovação automática

O Certbot configura renovação automática, mas você pode testar:

```bash
# Testar renovação
sudo certbot renew --dry-run
```

---

## ✅ Passo 11: Verificar e Testar

### 11.1 Verificar serviços

```bash
# Verificar status do PM2
pm2 status

# Verificar status do Nginx
sudo systemctl status nginx

# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Verificar logs do backend
pm2 logs estofados-backend --lines 50
```

### 11.2 Testar endpoints

```bash
# Testar health check
curl http://localhost:3001/health

# Testar através do Nginx
curl http://localhost/health
# Ou se tiver domínio:
# curl https://seu-dominio.com/health
```

### 11.3 Verificar frontend

Abra no navegador:
- `http://seu-ip-vps` ou
- `https://seu-dominio.com` (se configurou SSL)

---

## 🔄 Passo 12: Configurar Backups (Opcional mas Recomendado)

### 12.1 Script de backup do banco de dados

```bash
# Criar diretório de backups
sudo mkdir -p /var/backups/estofados
sudo chown $USER:$USER /var/backups/estofados

# Criar script de backup
nano ~/backup-db.sh
```

Cole o seguinte conteúdo:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/estofados"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/estofados_$DATE.sql"

# Criar backup
sudo -u postgres pg_dump estofados > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "estofados_*.sql.gz" -mtime +7 -delete

echo "Backup criado: $BACKUP_FILE.gz"
```

Tornar executável:

```bash
chmod +x ~/backup-db.sh
```

### 12.2 Configurar cron para backups automáticos

```bash
# Editar crontab
crontab -e
```

Adicione a linha (backup diário às 2h da manhã):

```
0 2 * * * /home/seu-usuario/backup-db.sh >> /var/log/backup-db.log 2>&1
```

---

## 🐛 Troubleshooting

### Problema: Aplicação não inicia

```bash
# Verificar logs do PM2
pm2 logs estofados-backend

# Verificar se a porta está em uso
sudo netstat -tulpn | grep 3001

# Verificar variáveis de ambiente
cd /var/www/estofados/backend
cat .env
```

### Problema: Erro de conexão com banco de dados

```bash
# Testar conexão
sudo -u postgres psql -d estofados -U estofados_user

# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Problema: Erro 502 Bad Gateway

```bash
# Verificar se o backend está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Testar conexão local
curl http://localhost:3001/health
```

### Problema: Frontend não carrega

```bash
# Verificar se o build foi feito
ls -la /var/www/estofados/frontend/dist

# Verificar permissões
sudo chown -R www-data:www-data /var/www/estofados/frontend/dist

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

### Problema: CORS errors

```bash
# Verificar FRONTEND_URL no .env do backend
cd /var/www/estofados/backend
grep FRONTEND_URL .env

# Reiniciar aplicação após alterar .env
pm2 restart estofados-backend
```

---

## 📝 Comandos Úteis para Manutenção

### Atualizar aplicação

```bash
cd /var/www/estofados

# Fazer pull das alterações
git pull origin main

# Instalar novas dependências (backend)
cd backend
npm install --production
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart estofados-backend

# Instalar novas dependências (frontend)
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### Ver logs

```bash
# Logs do backend
pm2 logs estofados-backend

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Reiniciar serviços

```bash
# Reiniciar backend
pm2 restart estofados-backend

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## 🎉 Conclusão

Seu sistema está agora em produção! 

### Checklist final:

- [ ] Backend rodando com PM2
- [ ] Frontend buildado e servido pelo Nginx
- [ ] Banco de dados configurado e migrações aplicadas
- [ ] SSL/HTTPS configurado (se tiver domínio)
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Health check funcionando
- [ ] Aplicação acessível via navegador

### Próximos passos:

1. Criar usuário administrador no sistema
2. Configurar monitoramento (opcional)
3. Configurar alertas (opcional)
4. Documentar credenciais em local seguro

---

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `pm2 logs estofados-backend`
2. Verifique o status dos serviços: `pm2 status`, `sudo systemctl status nginx`
3. Consulte a seção de Troubleshooting acima
4. Verifique as variáveis de ambiente: `cat /var/www/estofados/backend/.env`

**Boa sorte com seu deploy! 🚀**

