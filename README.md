# 🏆 Na Gaveta

> **Na Gaveta** é uma plataforma web moderna de bolão esportivo voltada ao público brasileiro. Projetada para ser simples de usar, com identidade visual premium (tema escuro e esportivo) e arquitetura escalável para evoluir futuramente para um aplicativo mobile.

Esta é a **Fase 1** (Fundação), entregando a base estrutural do monorepo, frontend e backend, pronta para receber a lógica de negócio e as próximas funcionalidades.

---

## 🏗️ Arquitetura e Stack

O projeto está organizado como um **Monorepo** com duas pastas principais:

### 1. Frontend (`/frontend`)
- **Framework:** React 19 + Vite + TypeScript
- **Estilização:** Tailwind CSS v3 com paleta customizada
- **Roteamento:** React Router v6
- **Estado/Dados:** Context API (Auth) + TanStack React Query (preparado)
- **PWA:** Configuração via Manifest e Service Worker manual, pronto para instalação mobile

### 2. Backend (`/backend`)
- **Framework:** Node.js + Express + TypeScript
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** JWT (JSON Web Tokens) com bcrypt
- **Segurança:** Helmet, CORS configurado

---

## 🎨 Identidade Visual e Design System

O frontend já inclui um mini-Design System (`src/components/ui`) baseado na identidade solicitada:

- **Tema Base:** Escuro (`#0F0F10` principal, `#18181B` para cards)
- **Cores de Marca:** Laranja (`#F97316` a `#FB923C`) e Verde para status Ao Vivo (`#22C55E`)
- **Tipografia:** Fonte `Inter`
- **Layout:** Mobile-first, totalmente responsivo, com Navbar e navegação inferior/lateral adaptativa

---

## 🚀 Como Rodar o Projeto Localmente

Siga o passo a passo abaixo para rodar o ambiente de desenvolvimento completo:

### Pré-requisitos
- Node.js (v20+)
- PostgreSQL rodando localmente (ou via Docker)

### 1. Instalação de Dependências

Na raiz do projeto, instale todas as dependências do monorepo de uma vez:

```bash
npm run install:all
```

*(Isso instalará as dependências da raiz, do frontend e do backend).*

### 2. Configuração do Banco de Dados e Variáveis de Ambiente

No backend, configure as variáveis de ambiente:

1. Copie o arquivo de exemplo:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Edite o arquivo `.env` e ajuste a `DATABASE_URL` com as credenciais do seu PostgreSQL local:
   ```env
   DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/na_gaveta_dev"
   ```

No frontend, as variáveis de desenvolvimento já estão prontas no arquivo `.env.local` (criado automaticamente pelo setup).

### 3. Migrações e Seed do Banco

Ainda na pasta `backend`, crie as tabelas no banco e insira os dados iniciais de teste:

```bash
# Roda as migrações do Prisma para criar as tabelas
npm run db:migrate

# Roda o script de seed para popular com usuários, campeonatos e bolões de teste
npm run db:seed
```

O seed criará 3 usuários de teste com a senha `senha123`:
- `admin@nagaveta.com`
- `joao@exemplo.com`
- `maria@exemplo.com`

### 4. Rodando a Aplicação

Volte para a raiz do projeto e inicie os dois servidores (Frontend e Backend) simultaneamente:

```bash
cd ..
npm run dev
```

- **Frontend:** Estará disponível em `http://localhost:5173`
- **Backend API:** Estará disponível em `http://localhost:3001`
- **Healthcheck:** Teste a API em `http://localhost:3001/api/health`

---

## 📂 Estrutura de Pastas Entregue

```text
na-gaveta/
├── package.json          # Scripts globais (dev, build, db:migrate, etc)
├── README.md             # Esta documentação
│
├── frontend/             # React + Vite + Tailwind
│   ├── index.html        # Entry point com PWA Meta Tags
│   ├── public/           # Manifest, Service Worker, Ícones
│   ├── src/
│   │   ├── components/   # Componentes UI (Button, Input, Card) e Layout
│   │   ├── hooks/        # Custom hooks (useAuth)
│   │   ├── pages/        # Telas (Home, Login, Register, Dashboard, 404)
│   │   ├── services/     # Configuração Axios e chamadas de API
│   │   ├── types/        # Interfaces TypeScript compartilhadas
│   │   ├── App.tsx       # Roteamento (React Router)
│   │   └── index.css     # Tailwind e estilos globais
│   └── tailwind.config.js# Paleta de cores e animações customizadas
│
└── backend/              # Express + Prisma
    ├── prisma/
    │   ├── schema.prisma # Modelagem do banco (User, Pool, Match, etc)
    │   └── seed.ts       # Dados mock para desenvolvimento
    ├── src/
    │   ├── controllers/  # Lógica das rotas (Auth, Pool, Championship)
    │   ├── middlewares/  # Autenticação JWT e validações
    │   ├── routes/       # Definição dos endpoints REST
    │   ├── types/        # Tipagens do backend
    │   ├── utils/        # Instância singleton do Prisma
    │   ├── app.ts        # Configuração do Express
    │   └── server.ts     # Entry point do backend
    └── .env              # Variáveis de ambiente (DB, JWT)
```

---

## 🔜 Próximos Passos Sugeridos

A fundação está pronta, sólida e rodando. Para as próximas fases de desenvolvimento, sugerimos:

1. **Lógica de Palpites:**
   - Implementar a tela de detalhes do Bolão (`/pools/:id`).
   - Criar interface para o usuário inserir e editar seus palpites (`Prediction`) nas rodadas abertas.
   - Backend: Criar endpoints para salvar e validar horários dos palpites (antes do jogo começar).

2. **Cálculo de Pontuação (Engine):**
   - Criar um serviço/cron no backend que atualiza o status das partidas para `FINISHED`.
   - Calcular a pontuação de cada `Prediction` com base nas regras do bolão (`ScoreRule`).
   - Atualizar o `score` total dos membros no `PoolMember`.

3. **Painel Administrativo / Integração de API Externa:**
   - Implementar integração com alguma API esportiva real (ex: API-Football) para atualizar campeonatos, rodadas e placares automaticamente, eliminando a necessidade de trabalho manual do administrador.

4. **Evolução PWA:**
   - Melhorar o Service Worker utilizando a biblioteca Workbox para estratégias de cache mais avançadas e notificações push.

---
*Feito com 🧡 para o futebol brasileiro.*
