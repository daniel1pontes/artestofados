# Sistema de Estofados - Guia de Instalação Local

Este guia fornece instruções detalhadas para configurar e executar o sistema localmente em sua máquina.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18.0.0 ou superior)
- **npm** (versão 8.0.0 ou superior)
- **PostgreSQL** (versão 12 ou superior)
- **Git** (para clonar o repositório, se necessário)

### Verificando as instalações

```bash
node --version
npm --version
psql --version
```

## 🚀 Instalação e Configuração

### Passo 1: Clonar o Repositório (se necessário)

Se você ainda não tem o código localmente:

```bash
git clone <url-do-repositorio>
cd artestofados
```

### Passo 2: Configurar o Banco de Dados PostgreSQL

1. **Criar o banco de dados:**

   Abra o terminal e execute:

   ```bash
   # Conecte-se ao PostgreSQL (pode pedir senha)
   psql -U postgres
   ```

   Dentro do PostgreSQL, execute:

   ```sql
   CREATE DATABASE estofados_db;
   CREATE USER artestofados WITH PASSWORD 'artestofados25';
   GRANT ALL PRIVILEGES ON DATABASE estofados_db TO artestofados;
   \q
   ```

   Ou, se preferir usar um usuário diferente, ajuste as credenciais conforme necessário.

2. **Verificar a conexão:**

   ```bash
   psql -U artestofados -d estofados_db -h localhost
   ```

### Passo 3: Configurar Variáveis de Ambiente

#### Backend

1. **Criar arquivo `.env` no diretório `backend/`:**

   ```bash
   cd backend
   ```

   Crie um arquivo chamado `.env` com o seguinte conteúdo:

   ```env
   NODE_ENV=development
   PORT=4041
   DATABASE_URL=postgresql://artestofados:artestofados25@localhost:5432/estofados_db?sslmode=disable
   JWT_SECRET=sua-chave-secreta-jwt-com-pelo-menos-32-caracteres-para-seguranca
   JWT_EXPIRES_IN=7d
   WHATSAPP_SESSION_PATH=./whatsapp-sessions
   FRONTEND_URL=http://localhost:5173
   OPENAI_API_KEY=opcional-sua-chave-openai-se-tiver
   GOOGLE_API_CREDENTIALS=opcional-json-com-credenciais-google-se-tiver
   ```

   **⚠️ Importante:**
   - Substitua `sua-chave-secreta-jwt-com-pelo-menos-32-caracteres-para-seguranca` por uma chave secreta forte com pelo menos 32 caracteres
   - Ajuste `DATABASE_URL` se você usou credenciais diferentes do PostgreSQL
   - `FRONTEND_URL` deve apontar para onde o frontend estará rodando (geralmente `http://localhost:5173` para Vite)

#### Frontend

1. **Criar arquivo `.env` no diretório `frontend/`:**

   ```bash
   cd ../frontend
   ```

   Crie um arquivo chamado `.env` com o seguinte conteúdo:

   ```env
   VITE_API_URL=http://localhost:4041/api
   ```

   **Nota:** O Vite usa o prefixo `VITE_` para variáveis de ambiente expostas ao cliente.

### Passo 4: Instalar Dependências

#### Instalar dependências do projeto raiz

```bash
cd ..
npm install
```

Este comando também instalará as dependências do backend e frontend automaticamente (via script `postinstall`).

#### Ou instalar manualmente:

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Passo 5: Configurar o Prisma (Backend)

1. **Gerar o Prisma Client:**

   ```bash
   cd backend
   npm run prisma:generate
   ```

2. **Executar as migrações do banco de dados:**

   ```bash
   npm run prisma:migrate
   ```

   Isso criará todas as tabelas necessárias no banco de dados.

3. **Popular o banco com dados iniciais (seed):**

   ```bash
   npm run prisma:seed
   ```

   Isso criará usuários iniciais e dados de exemplo.

### Passo 6: Verificar a Estrutura de Diretórios

Certifique-se de que os seguintes diretórios existem:

**Backend:**
```bash
cd backend
mkdir -p uploads/pdfs whatsapp-sessions
```

## 🏃 Executando o Sistema

### Opção 1: Executar Backend e Frontend Juntos (Recomendado)

No diretório raiz do projeto:

```bash
npm run dev
```

Este comando iniciará:
- Backend na porta **4041** (http://localhost:4041)
- Frontend na porta **5173** (http://localhost:5173)

### Opção 2: Executar Separadamente

#### Terminal 1 - Backend:

```bash
cd backend
npm run dev
```

O backend estará disponível em: **http://localhost:4041**

#### Terminal 2 - Frontend:

```bash
cd frontend
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

## 🌐 Acessando o Sistema

1. Abra seu navegador e acesse: **http://localhost:5173**
2. Faça login com as credenciais criadas pelo seed (verifique o arquivo `backend/src/seed.ts` para ver quais usuários foram criados)

## 🐳 Alternativa: Usando Docker

Se preferir usar Docker, você pode executar o banco de dados via Docker:

### Passo 1: Iniciar o PostgreSQL com Docker

No diretório raiz:

```bash
docker-compose up -d
```

Isso iniciará o PostgreSQL na porta 5432.

### Passo 2: Ajustar a DATABASE_URL

No arquivo `backend/.env`, use:

```env
DATABASE_URL=postgresql://artestofados:artestofados25@localhost:5432/estofados_db?sslmode=disable
```

### Passo 3: Seguir os passos 4, 5 e 6 acima

## 🔧 Comandos Úteis

### Backend

```bash
cd backend

# Desenvolvimento
npm run dev

# Compilar TypeScript
npm run build

# Executar em produção
npm start

# Testes
npm test
npm run test:watch
npm run test:coverage

# Prisma
npm run prisma:generate    # Gerar Prisma Client
npm run prisma:migrate     # Executar migrações
npm run prisma:seed        # Popular banco de dados
npm run prisma:studio      # Abrir Prisma Studio (interface visual)
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Linting
npm run lint
```

### Projeto Raiz

```bash
# Executar backend e frontend juntos
npm run dev

# Build completo
npm run build

# Apenas backend
npm run dev:backend

# Apenas frontend
npm run dev:frontend
```

## 🐛 Solução de Problemas

### Erro: "DATABASE_URL is required"

- Verifique se o arquivo `.env` existe no diretório `backend/`
- Confirme que a variável `DATABASE_URL` está definida corretamente
- Certifique-se de que não há espaços extras ou aspas desnecessárias

### Erro: "JWT_SECRET must be at least 32 characters long"

- Verifique se o `JWT_SECRET` no arquivo `.env` tem pelo menos 32 caracteres

### Erro de conexão com o banco de dados

- Verifique se o PostgreSQL está rodando: `pg_isready` ou `psql -U postgres`
- Confirme as credenciais no arquivo `.env`
- Verifique se o banco de dados `estofados_db` foi criado

### Erro: "Cannot find module"

- Execute `npm install` novamente no diretório onde está ocorrendo o erro
- Limpe o cache: `npm cache clean --force`
- Delete `node_modules` e `package-lock.json`, depois execute `npm install` novamente

### Porta já em uso

- Se a porta 4041 (backend) ou 5173 (frontend) estiver em uso, você pode:
  - Parar o processo que está usando a porta
  - Alterar a porta no arquivo `.env` (backend) ou `vite.config.ts` (frontend)

### Erro nas migrações do Prisma

- Certifique-se de que o banco de dados está acessível
- Execute: `npm run prisma:generate` antes de `npm run prisma:migrate`
- Se necessário, reset o banco: `npx prisma migrate reset` (⚠️ isso apagará todos os dados)

## 📝 Estrutura do Projeto

```
artestofados/
├── backend/              # API Node.js/Express
│   ├── src/             # Código fonte
│   ├── prisma/          # Schema e migrações do Prisma
│   ├── uploads/         # Arquivos enviados
│   └── whatsapp-sessions/ # Sessões do WhatsApp
├── frontend/            # Aplicação React
│   ├── src/            # Código fonte
│   └── public/         # Arquivos estáticos
└── docker-compose.yml   # Configuração Docker (PostgreSQL)
```

## 🔐 Segurança

- **Nunca** commite arquivos `.env` no Git
- Use senhas fortes para `JWT_SECRET` e banco de dados
- Em produção, use variáveis de ambiente seguras
- Mantenha as dependências atualizadas

## 📚 Recursos Adicionais

- [Documentação do Prisma](https://www.prisma.io/docs)
- [Documentação do Vite](https://vitejs.dev/)
- [Documentação do React](https://react.dev/)
- [Documentação do Express](https://expressjs.com/)

## 💡 Dicas

- Use `npm run prisma:studio` para visualizar e editar dados do banco de forma visual
- O frontend usa Hot Module Replacement (HMR), então as mudanças aparecem automaticamente
- Para debugar o backend, você pode usar `console.log` ou configurar um debugger no VS Code

## ✅ Checklist de Verificação

Antes de começar a desenvolver, verifique:

- [ ] Node.js e npm instalados
- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados `estofados_db` criado
- [ ] Arquivo `.env` criado no `backend/` com todas as variáveis
- [ ] Arquivo `.env` criado no `frontend/` com `VITE_API_URL`
- [ ] Dependências instaladas (`npm install` em cada diretório)
- [ ] Prisma Client gerado (`npm run prisma:generate`)
- [ ] Migrações executadas (`npm run prisma:migrate`)
- [ ] Seed executado (`npm run prisma:seed`)
- [ ] Backend rodando sem erros
- [ ] Frontend rodando sem erros
- [ ] Acesso ao sistema via navegador funcionando

---

**Pronto!** Agora você deve conseguir rodar o sistema localmente. Se encontrar algum problema, consulte a seção de Solução de Problemas ou verifique os logs no terminal.







