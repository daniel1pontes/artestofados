# 📚 Documentação Completa do Sistema Artestofados

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Modelo de Dados](#modelo-de-dados)
6. [Fluxos Principais](#fluxos-principais)
7. [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
8. [APIs e Endpoints](#apis-e-endpoints)
9. [Integrações](#integrações)
10. [Segurança](#segurança)

---

## 🎯 Visão Geral

O **Sistema Artestofados** é uma plataforma completa de gerenciamento para uma empresa de estofados, oferecendo:

- 🤖 **Chatbot inteligente via WhatsApp** com processamento de linguagem natural
- 📋 **Gerenciamento de Ordem de Serviço (OS)** com geração automática de PDFs
- 📅 **Sistema de agendamentos** com integração ao Google Calendar
- 👥 **Gestão de usuários** com controle de permissões
- 📊 **Dashboard administrativo** para acompanhamento de operações

### Objetivo

Automatizar e otimizar os processos de atendimento, orçamento e agendamento de uma empresa de estofados, proporcionando uma experiência melhor tanto para clientes quanto para a equipe interna.

---

## 🏗️ Arquitetura do Sistema

### Arquitetura Geral

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Vite
│   (React SPA)   │  TailwindCSS + React Router
└────────┬────────┘
         │ HTTP/REST API
         │ (JSON)
┌────────▼────────┐
│    Backend      │  Node.js + Express + TypeScript
│   (REST API)    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────────┐
    │         │          │              │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌───────▼──────┐
│PostgreSQL│ │WhatsApp│ │  OpenAI  │ │Google Calendar│
│ (Prisma) │ │ Web.js │ │   API    │ │     API      │
└─────────┘ └────────┘ └──────────┘ └──────────────┘
```

### Padrão de Arquitetura

O sistema segue uma **arquitetura em camadas**:

1. **Camada de Apresentação (Frontend)**
   - React com TypeScript
   - Componentes reutilizáveis
   - Gerenciamento de estado com Context API

2. **Camada de API (Backend)**
   - Express.js como framework web
   - Rotas organizadas por domínio
   - Middleware para autenticação e tratamento de erros

3. **Camada de Serviços**
   - Lógica de negócios isolada
   - Serviços especializados (Chatbot, WhatsApp, PDF, etc.)

4. **Camada de Dados**
   - Prisma ORM para abstração do banco
   - PostgreSQL como banco de dados relacional

---

## 🛠️ Stack Tecnológico

### Backend

#### Core
- **Node.js 18+** - Runtime JavaScript
- **TypeScript 5.9** - Tipagem estática
- **Express.js 4.18** - Framework web

#### Banco de Dados
- **PostgreSQL 16+** - Banco de dados relacional
- **Prisma 6.19** - ORM (Object-Relational Mapping)

#### Autenticação e Segurança
- **JWT (jsonwebtoken)** - Tokens de autenticação
- **bcryptjs** - Hash de senhas
- **Helmet** - Headers de segurança HTTP
- **CORS** - Controle de acesso cross-origin

#### Integrações
- **whatsapp-web.js 1.34** - Integração com WhatsApp
- **OpenAI API 4.104** - Processamento de linguagem natural
- **googleapis** - Integração com Google Calendar
- **Puppeteer** - Automação de navegador (para WhatsApp)

#### Utilitários
- **Multer** - Upload de arquivos
- **PDFKit / pdf-lib** - Geração de PDFs
- **date-fns** - Manipulação de datas
- **Zod** - Validação de schemas
- **Morgan** - Logging HTTP

### Frontend

#### Core
- **React 18.2** - Biblioteca UI
- **TypeScript 5.2** - Tipagem estática
- **Vite 4.5** - Build tool e dev server

#### Roteamento e Estado
- **React Router DOM 6.18** - Roteamento SPA
- **Context API** - Gerenciamento de estado global

#### UI e Estilização
- **TailwindCSS 3.3** - Framework CSS utility-first
- **Lucide React** - Ícones
- **React Hot Toast** - Notificações

#### HTTP e Dados
- **Axios 1.6** - Cliente HTTP
- **TanStack React Query 5.8** - Gerenciamento de estado servidor

---

## 📁 Estrutura do Projeto

```
artestofados/
├── backend/                    # Servidor Node.js
│   ├── prisma/                 # Configuração Prisma
│   │   ├── schema.prisma       # Schema do banco de dados
│   │   └── migrations/         # Migrações do banco
│   ├── src/
│   │   ├── app.ts              # Configuração Express
│   │   ├── server.ts           # Ponto de entrada
│   │   ├── config/             # Configurações
│   │   │   └── environment.ts  # Validação de variáveis de ambiente
│   │   ├── middleware/         # Middlewares
│   │   │   ├── auth.ts         # Autenticação JWT
│   │   │   └── errorHandler.ts # Tratamento de erros
│   │   ├── routes/             # Rotas da API
│   │   │   ├── auth.ts         # Autenticação
│   │   │   ├── users.ts        # Usuários
│   │   │   ├── os.ts           # Ordem de Serviço
│   │   │   ├── appointments.ts # Agendamentos
│   │   │   ├── chatbot.ts      # Chatbot (web)
│   │   │   ├── chat.ts         # Chat (WhatsApp)
│   │   │   └── whatsapp.ts     # Controle WhatsApp
│   │   ├── services/           # Lógica de negócios
│   │   │   ├── ChatbotService.ts
│   │   │   ├── WhatsAppService.ts
│   │   │   ├── AppointmentService.ts
│   │   │   ├── GoogleCalendarService.ts
│   │   │   └── pdfGenerator.ts
│   │   ├── modules/            # Módulos especializados
│   │   │   └── chatbot/
│   │   │       ├── NaturalLanguageEngine.ts
│   │   │       └── ConversationRepository.ts
│   │   └── utils/              # Utilitários
│   │       ├── logger.ts
│   │       └── DateTimeParser.ts
│   ├── uploads/                # Arquivos enviados
│   │   └── pdfs/               # PDFs gerados
│   └── package.json
│
├── frontend/                    # Aplicação React
│   ├── public/                 # Arquivos estáticos
│   │   └── images/
│   │       └── logo.png
│   ├── src/
│   │   ├── App.tsx             # Componente raiz
│   │   ├── main.tsx            # Ponto de entrada
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   └── Layout.tsx
│   │   ├── contexts/           # Context API
│   │   │   └── AuthContext.tsx
│   │   ├── pages/              # Páginas da aplicação
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Chatbot.tsx
│   │   │   ├── OrderService.tsx
│   │   │   ├── OrderServiceList.tsx
│   │   │   ├── OrderServiceDetail.tsx
│   │   │   └── Users.tsx
│   │   ├── services/           # Serviços de API
│   │   │   └── api.ts          # Cliente Axios
│   │   └── index.css           # Estilos globais
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml          # Configuração Docker (PostgreSQL)
├── package.json                # Scripts do projeto raiz
└── README.md
```

---

## 💾 Modelo de Dados

### Entidades Principais

#### 1. User (Usuário)
```prisma
- id: String (CUID)
- email: String (único)
- name: String
- password: String (hasheado)
- role: UserRole (ADMIN | ATTENDANT)
- createdAt: DateTime
- updatedAt: DateTime
```

**Relacionamentos:**
- Cria agendamentos (Appointment)
- Cria/edita Ordens de Serviço (OrderService)
- Cria sessões e mensagens (Session, Message)

#### 2. OrderService (Ordem de Serviço)
```prisma
- id: String
- clientName: String
- clientPhone: String
- clientEmail: String?
- clientAddress: String?
- deliveryDeadline: DateTime?
- paymentMethod: String?
- discount: Float
- total: Float
- status: OSStatus (PENDING | APPROVED | REJECTED | COMPLETED)
- pdfPath: String?
- images: Json? (array de imagens em base64)
- createdAt: DateTime
- updatedAt: DateTime
```

**Relacionamentos:**
- Pertence a um User (criador/editor)
- Tem múltiplos OrderItem

#### 3. OrderItem (Item da OS)
```prisma
- id: String
- name: String
- quantity: Int
- unitValue: Float
- total: Float
- osId: String (FK)
```

#### 4. Appointment (Agendamento)
```prisma
- id: String
- clientName: String
- clientPhone: String
- type: AppointmentType (ONLINE | IN_STORE)
- start: DateTime
- end: DateTime
- gcalEventId: String? (ID no Google Calendar)
- meetLink: String? (link para reunião online)
- createdAt: DateTime
- updatedAt: DateTime
```

#### 5. Session (Sessão de Conversa)
```prisma
- id: String
- phoneNumber: String (único)
- state: String (estado da conversa)
- metadata: Json? (dados contextuais)
- createdAt: DateTime
- updatedAt: DateTime
```

**Relacionamentos:**
- Tem múltiplas Message
- Pertence a um User

#### 6. Message (Mensagem)
```prisma
- id: String
- sessionId: String (FK)
- fromNumber: String
- body: String
- timestamp: DateTime
- messageType: String
- hasMedia: Boolean
- mediaUrl: String?
- createdAt: DateTime
```

#### 7. WhatsappConn (Conexão WhatsApp)
```prisma
- id: String
- status: WhatsappStatus (CONNECTED | DISCONNECTED | PAUSED)
- qrCode: String? (QR code para conexão)
- phone: String? (número conectado)
- connectedAt: DateTime?
- createdAt: DateTime
- updatedAt: DateTime
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Autenticação

```
┌─────────┐
│ Usuário │
└────┬────┘
     │ 1. Preenche email/senha
     ▼
┌─────────────┐
│  Frontend   │
│  (Login.tsx)│
└────┬────────┘
     │ 2. POST /api/auth/login
     ▼
┌─────────────┐
│   Backend   │
│ (auth.ts)   │
└────┬────────┘
     │ 3. Valida credenciais
     │ 4. Compara hash (bcrypt)
     ▼
┌─────────────┐
│  PostgreSQL │
│   (Prisma)  │
└────┬────────┘
     │ 5. Retorna usuário
     ▼
┌─────────────┐
│   Backend   │
└────┬────────┘
     │ 6. Gera JWT token
     ▼
┌─────────────┐
│  Frontend   │
│  (Salva token no localStorage)
└────┬────────┘
     │ 7. Redireciona para Dashboard
     ▼
┌─────────────┐
│  Dashboard  │
└─────────────┘
```

### 2. Fluxo de Criação de Ordem de Serviço

```
┌─────────┐
│ Usuário │
└────┬────┘
     │ 1. Preenche formulário OS
     │    (dados do cliente, itens, imagens)
     ▼
┌─────────────┐
│  Frontend   │
│OrderService │
└────┬────────┘
     │ 2. POST /api/os
     │    (multipart/form-data)
     ▼
┌─────────────┐
│   Backend   │
│  (os.ts)    │
└────┬────────┘
     │ 3. Valida dados
     │ 4. Processa imagens (Multer)
     │ 5. Calcula totais
     ▼
┌─────────────┐
│  PostgreSQL │
│   (Prisma)  │
└────┬────────┘
     │ 6. Salva OS e itens
     ▼
┌─────────────┐
│   Backend   │
│pdfGenerator │
└────┬────────┘
     │ 7. Gera PDF (se solicitado)
     ▼
┌─────────────┐
│  Frontend   │
│  (Sucesso)  │
└─────────────┘
```

### 3. Fluxo de Chatbot via WhatsApp

```
┌─────────┐
│ Cliente │
└────┬────┘
     │ 1. Envia mensagem no WhatsApp
     ▼
┌─────────────┐
│ WhatsApp   │
│  Web.js    │
└────┬────────┘
     │ 2. Evento 'message'
     ▼
┌─────────────┐
│WhatsAppService│
└────┬────────┘
     │ 3. Verifica se bot está ativo
     │ 4. Ignora grupos e mensagens próprias
     ▼
┌─────────────┐
│ChatbotService│
└────┬────────┘
     │ 5. Obtém histórico da conversa
     │ 6. Adiciona mensagem ao histórico
     ▼
┌─────────────┐
│   OpenAI    │
│     API     │
└────┬────────┘
     │ 7. Processa com GPT
     │ 8. Retorna resposta contextual
     ▼
┌─────────────┐
│WhatsAppService│
└────┬────────┘
     │ 9. Envia resposta via WhatsApp
     ▼
┌─────────┐
│ Cliente │
└─────────┘
```

### 4. Fluxo de Agendamento via Chatbot

```
┌─────────┐
│ Cliente │
└────┬────┘
     │ 1. Conversa com chatbot
     │    "Quero agendar uma reunião"
     ▼
┌─────────────┐
│NaturalLanguage│
│   Engine    │
└────┬────────┘
     │ 2. Interpreta intenção
     │ 3. Extrai slots:
     │    - Nome
     │    - Tipo (ONLINE/IN_STORE)
     │    - Data
     │    - Horário
     ▼
┌─────────────┐
│Conversation│
│ Repository │
└────┬────────┘
     │ 4. Atualiza estado da conversa
     │ 5. Salva dados coletados
     ▼
┌─────────────┐
│   Backend   │
│(chatbot.ts) │
└────┬────────┘
     │ 6. Valida agendamento
     │ 7. Verifica disponibilidade
     ▼
┌─────────────┐
│Appointment │
│  Service   │
└────┬────────┘
     │ 8. Cria agendamento
     │ 9. Sincroniza com Google Calendar
     ▼
┌─────────────┐
│Google      │
│  Calendar  │
└────┬────────┘
     │ 10. Retorna confirmação
     ▼
┌─────────┐
│ Cliente │
│(via bot)│
└─────────┘
```

---

## 🎯 Funcionalidades Detalhadas

### 1. Sistema de Autenticação

**Características:**
- Login com email e senha
- Senhas hasheadas com bcrypt (10 rounds)
- Tokens JWT com expiração de 7 dias
- Middleware de autenticação em rotas protegidas
- Controle de permissões (ADMIN vs ATTENDANT)

**Endpoints:**
- `POST /api/auth/login` - Autenticação
- `POST /api/auth/register` - Registro (apenas ADMIN)
- `GET /api/auth/me` - Obter usuário atual

### 2. Gerenciamento de Ordem de Serviço (OS)

**Funcionalidades:**
- Criação de OS com múltiplos itens
- Upload de até 20 imagens por OS
- Cálculo automático de totais e descontos
- Geração automática de PDF com imagens incorporadas
- Status: PENDING, APPROVED, REJECTED, COMPLETED
- Histórico de criação/edição

**Fluxo:**
1. Usuário preenche dados do cliente
2. Adiciona itens (nome, quantidade, valor unitário)
3. Faz upload de imagens (opcional)
4. Sistema calcula subtotal, desconto e total
5. Gera PDF automaticamente (opcional)
6. Salva no banco de dados

**Endpoints:**
- `GET /api/os` - Listar OS (com paginação e busca)
- `POST /api/os` - Criar nova OS
- `GET /api/os/:id` - Obter OS específica
- `PUT /api/os/:id` - Atualizar OS
- `DELETE /api/os/:id` - Deletar OS
- `GET /api/os/:id/pdf` - Download do PDF

### 3. Chatbot Inteligente

**Características:**
- Processamento de linguagem natural com OpenAI GPT
- Contexto de conversa mantido por sessão
- Fluxo estruturado de coleta de dados
- Suporte a agendamentos
- Personalidade: "Maria", assistente da Artestofados

**Estados da Conversa:**
1. **INTRO** - Apresentação inicial
2. **ASKING_NAME** - Coletando nome
3. **ASKING_SERVICE** - Tipo de serviço (FABRICAR/REFORMAR)
4. **ASKING_APPOINTMENT_TYPE** - Tipo de agendamento
5. **ASKING_DATE** - Coletando data
6. **ASKING_TIME** - Coletando horário
7. **CONFIRMING** - Confirmando dados
8. **COMPLETED** - Conversa finalizada

**Endpoints:**
- `POST /api/chatbot/message` - Enviar mensagem
- `DELETE /api/chatbot/history/:sessionId` - Limpar histórico

### 4. Integração WhatsApp

**Funcionalidades:**
- Conexão via WhatsApp Web (QR Code)
- Bot automático que responde mensagens
- Ignora grupos e mensagens próprias
- Suporte a mídia (imagens)
- Status de conexão em tempo real

**Estados:**
- **CONNECTED** - Conectado e ativo
- **DISCONNECTED** - Desconectado
- **PAUSED** - Aguardando QR Code

**Endpoints:**
- `GET /api/whatsapp/status` - Status da conexão
- `GET /api/whatsapp/qrcode` - Obter QR Code
- `POST /api/whatsapp/connect` - Conectar
- `POST /api/whatsapp/disconnect` - Desconectar
- `POST /api/whatsapp/bot/toggle` - Ativar/desativar bot

### 5. Sistema de Agendamentos

**Funcionalidades:**
- Criação de agendamentos (ONLINE ou IN_STORE)
- Validação de conflitos de horário
- Integração com Google Calendar
- Geração de links para reuniões online
- Histórico de criação/edição

**Validações:**
- Não permite agendamentos no passado
- Verifica conflitos de horário
- Valida formato de data/hora
- Limita agendamentos por tipo

**Endpoints:**
- `GET /api/appointments` - Listar agendamentos
- `POST /api/appointments` - Criar agendamento
- `GET /api/appointments/:id` - Obter agendamento
- `PUT /api/appointments/:id` - Atualizar
- `DELETE /api/appointments/:id` - Deletar

### 6. Geração de PDFs

**Características:**
- PDFs profissionais com logo
- Incorporação de imagens diretamente no PDF
- Cálculo automático de valores
- Formatação brasileira (moeda, datas)
- Download via API

**Bibliotecas:**
- PDFKit - Geração de PDFs
- pdf-lib - Manipulação de PDFs existentes

### 7. Dashboard Administrativo

**Informações exibidas:**
- Estatísticas gerais
- Lista de OS recentes
- Agendamentos do dia
- Status do WhatsApp
- Gráficos e métricas (futuro)

---

## 🔌 APIs e Endpoints

### Autenticação (`/api/auth`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/login` | Login de usuário | Não |
| POST | `/register` | Registrar novo usuário | Admin |
| GET | `/me` | Obter usuário atual | Sim |

### Ordem de Serviço (`/api/os`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/` | Listar OS (paginação) | Sim |
| POST | `/` | Criar OS | Sim |
| GET | `/:id` | Obter OS específica | Sim |
| PUT | `/:id` | Atualizar OS | Sim |
| DELETE | `/:id` | Deletar OS | Sim |
| GET | `/:id/pdf` | Download PDF | Sim |

### Agendamentos (`/api/appointments`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/` | Listar agendamentos | Sim |
| POST | `/` | Criar agendamento | Sim |
| GET | `/:id` | Obter agendamento | Sim |
| PUT | `/:id` | Atualizar | Sim |
| DELETE | `/:id` | Deletar | Sim |

### Chatbot (`/api/chatbot`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/message` | Enviar mensagem | Sim |
| DELETE | `/history/:sessionId` | Limpar histórico | Sim |

### WhatsApp (`/api/whatsapp`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/status` | Status da conexão | Sim |
| GET | `/qrcode` | Obter QR Code | Sim |
| POST | `/connect` | Conectar | Sim |
| POST | `/disconnect` | Desconectar | Sim |
| POST | `/bot/toggle` | Ativar/desativar bot | Sim |

### Usuários (`/api/users`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/` | Listar usuários | Admin |
| POST | `/` | Criar usuário | Admin |
| PUT | `/:id` | Atualizar usuário | Admin |
| DELETE | `/:id` | Deletar usuário | Admin |

---

## 🔗 Integrações

### 1. OpenAI API

**Uso:**
- Processamento de linguagem natural no chatbot
- Interpretação de intenções do usuário
- Geração de respostas contextuais

**Configuração:**
```env
OPENAI_API_KEY=sua-chave-aqui
```

### 2. Google Calendar API

**Uso:**
- Sincronização de agendamentos
- Criação automática de eventos
- Geração de links para reuniões online

**Configuração:**
```env
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-credentials-account.json
```

### 3. WhatsApp Web.js

**Uso:**
- Conexão com WhatsApp via Web
- Envio/recebimento de mensagens
- Gerenciamento de sessão

**Configuração:**
- Usa LocalAuth para persistir sessão
- QR Code para autenticação inicial

---

## 🔒 Segurança

### Implementado

✅ **Autenticação JWT**
- Tokens com expiração
- Validação em todas as rotas protegidas

✅ **Hash de Senhas**
- bcrypt com 10 rounds
- Senhas nunca expostas

✅ **Headers de Segurança**
- Helmet configurado
- CORS restrito ao frontend

✅ **Validação de Dados**
- Zod para validação de schemas
- Validação de tipos TypeScript

✅ **Tratamento de Erros**
- Middleware centralizado
- Stack traces não expostos em produção

### Recomendações

⚠️ Implementar:
- Rate limiting
- Validação mais robusta de uploads
- Sanitização de inputs
- CSRF protection

---

## 📊 Métricas e Monitoramento

### Logs

- **Morgan** - Logs HTTP em formato combined
- **Logger customizado** - Logs estruturados em JSON
- Logs por contexto (serviço, módulo)

### Health Check

- Endpoint `/health` para monitoramento
- Retorna status, timestamp e ambiente

---

## 🚀 Deploy e Produção

### Build

**Backend:**
```bash
cd backend
npm run build  # Compila TypeScript
```

**Frontend:**
```bash
cd frontend
npm run build  # Gera arquivos estáticos otimizados
```

### Variáveis de Ambiente

Ver arquivos:
- `backend/.env.example`
- `frontend/.env.example`

### Documentação de Deploy

- `DEPLOY_VPS.md` - Guia completo de deploy em VPS
- `PRODUCTION.md` - Informações gerais de produção

---

## 📝 Próximos Passos e Melhorias

### Curto Prazo
- [ ] Implementar rate limiting
- [ ] Melhorar validação de uploads
- [ ] Adicionar testes automatizados
- [ ] Dashboard com gráficos

### Médio Prazo
- [ ] Notificações por email
- [ ] Relatórios em PDF
- [ ] App mobile (React Native)
- [ ] Integração com pagamentos

### Longo Prazo
- [ ] Multi-tenant
- [ ] API pública
- [ ] Integração com ERPs
- [ ] Analytics avançado

---

## 📞 Suporte e Contato

Para dúvidas ou suporte:
- Consulte a documentação de deploy: `DEPLOY_VPS.md`
- Verifique os logs do sistema
- Revise as variáveis de ambiente

---

**Última atualização:** 2024-12-04  
**Versão do Sistema:** 1.0.0

