# Sistema de Gerenciamento para Estofados

Sistema completo para gerenciamento de uma empresa de estofados, incluindo integração com WhatsApp, gerenciamento de pedidos, orçamentos e automação de atendimento.

## 🚀 Funcionalidades

- **Chatbot de WhatsApp** para atendimento automático a clientes
- Gerenciamento de **pedidos e orçamentos**
- Geração automática de **orçamentos em PDF**
- **Integração com IA** para processamento de mensagens
- **Dashboard administrativo** para acompanhamento de vendas e pedidos
- **Autenticação** segura de usuários
- **Banco de dados** PostgreSQL com Prisma ORM

## 🛠️ Tecnologias

### Backend

- **Node.js** com TypeScript
- **Express.js** para o servidor web
- **Prisma** como ORM para o banco de dados
- **PostgreSQL** como banco de dados principal
- **WhatsApp Web JS** para integração com WhatsApp
- **OpenAI** para processamento de linguagem natural
- **PDFKit** para geração de orçamentos

### Frontend

- **React** com TypeScript
- **Vite** como build tool
- **TailwindCSS** para estilização
- **React Router** para navegação
- **Axios** para requisições HTTP

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm (versão 8 ou superior)
- PostgreSQL
- Conta no serviço da OpenAI (para processamento de linguagem natural)
- Navegador moderno (Chrome, Firefox, Edge, etc.)

## 🚀 Como executar o projeto

### 1. Clonar o repositório

```bash
git clone <url-do-repositório>
cd artestofados
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
cp .env.example .env
```

Preencha as variáveis necessárias no arquivo `.env`.

### 3. Instalar dependências

```bash
# Instalar dependências do projeto
npm install

# As dependências do frontend e backend serão instaladas automaticamente
# Caso necessário, instale manualmente:
# cd frontend && npm install
# cd ../backend && npm install
```

### 4. Configurar o banco de dados

```bash
# Navegue para a pasta do backend
cd backend

# Execute as migrações do Prisma
npx prisma migrate dev

# (Opcional) Popular o banco com dados iniciais
npx prisma db seed
```

### 5. Iniciar o servidor de desenvolvimento

```bash
# Na raiz do projeto
npm run dev
```

Isso iniciará tanto o backend quanto o frontend em modo de desenvolvimento.

## 📦 Scripts disponíveis

Na raiz do projeto:

- `npm run dev` - Inicia o servidor de desenvolvimento (frontend + backend)
- `npm run build` - Constrói a aplicação para produção
- `npm start` - Inicia o servidor de produção (após o build)
- `npm test` - Executa os testes

## 🔧 Estrutura do Projeto

```
artestofados/
├── backend/              # Código do servidor
│   ├── prisma/          # Schema e migrações do Prisma
│   ├── src/             # Código-fonte do backend
│   │   ├── config/      # Configurações
│   │   ├── controllers/ # Controladores
│   │   ├── models/      # Modelos de dados
│   │   ├── routes/      # Rotas da API
│   │   ├── services/    # Lógica de negócios
│   │   └── utils/       # Utilitários
│   └── server.ts        # Ponto de entrada do servidor
│
├── frontend/            # Aplicação React
│   ├── public/          # Arquivos estáticos
│   └── src/             # Código-fonte do frontend
│       ├── components/  # Componentes React
│       ├── pages/       # Páginas da aplicação
│       ├── services/    # Serviços de API
│       └── App.tsx      # Componente raiz
│
├── .env.example         # Exemplo de variáveis de ambiente
├── docker-compose.yml   # Configuração do Docker
└── package.json         # Dependências e scripts
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Faça commit das suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ✉️ Contato

Equipe de Desenvolvimento - [seu-email@exemplo.com](mailto:seu-email@exemplo.com)

---

Desenvolvido com ❤️ por Estofados Premium
