# Stock Beauty Clinic

**Sistema de Controle de Estoque para Centros Estéticos**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)](https://www.prisma.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-ffca28?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)](https://vercel.com/)

Aplicação web completa para gestão de estoque de insumos em clínicas estéticas. Suporte a múltiplas unidades, controle de validade, rastreamento de consumo, previsão de reposição, relatórios em Excel e trilha de auditoria — tudo com acesso baseado em papéis (admin/clínico).

---

## Sumário

### Para Desenvolvedores

- [Stack Tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Setup Local](#instalação-e-setup-local)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Rotas da API](#rotas-da-api)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Auditoria](#auditoria)
- [Monitoramento (Sentry)](#monitoramento-sentry)
- [Deploy e Produção](#deploy-e-produção)
- [PWA](#pwa)

### Para Usuários

- [Visão Geral do Sistema](#visão-geral-do-sistema)
- [Login e Acesso](#login-e-acesso)
- [Painel Principal (Dashboard)](#painel-principal-dashboard)
- [Gerenciamento de Insumos](#gerenciamento-de-insumos)
- [Registro de Saídas](#registro-de-saídas)
- [Relatórios](#relatórios)
- [Administração: Usuários](#administração-usuários)
- [Administração: Unidades](#administração-unidades)
- [Administração: Auditoria](#administração-auditoria)
- [Seletor de Unidade](#seletor-de-unidade)
- [Instalar como Aplicativo (PWA)](#instalar-como-aplicativo-pwa)

---

# Para Desenvolvedores

## Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (tema new-york), Radix UI, Lucide icons |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Banco de Dados | PostgreSQL via Prisma ORM 7 |
| Autenticação | Firebase Auth (client) + Firebase Admin SDK (server) |
| Monitoramento | Sentry (client, server, edge) + Vercel Analytics |
| E-mail | Nodemailer (Gmail SMTP) |
| Relatórios | ExcelJS (geração de XLSX) |
| Deploy | Vercel (com cron jobs) |
| PWA | Web App Manifest + install prompt customizado |

## Pré-requisitos

- **Node.js** 18+
- **pnpm** (gerenciador de pacotes)
- **PostgreSQL** (local ou remoto — ex: Supabase, Neon)
- **Projeto Firebase** com Authentication habilitado (provedores Email/Senha e Google)
- **Conta de serviço Firebase** (chave privada para o Admin SDK)
- **Sentry DSN** (opcional, para monitoramento)
- **Conta Gmail** com App Password (opcional, para envio de relatórios por e-mail)

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto. Todas as variáveis obrigatórias são validadas no startup via Zod (`lib/env.ts`).

### Database

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL de conexão com o PostgreSQL (pode ser pooled) |
| `DIRECT_URL` | Não | URL direta (sem pool), usada pelo Prisma em migrações |

### Firebase — Client (prefixo `NEXT_PUBLIC_`, expostas ao browser)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Sim | API Key do projeto Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Sim | Auth Domain (ex: `projeto.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Sim | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Sim | Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sim | Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Sim | App ID |

### Firebase — Admin (server-only, NUNCA expor ao client)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `FIREBASE_ADMIN_PROJECT_ID` | Sim | Project ID da conta de serviço |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Sim | E-mail da conta de serviço |
| `FIREBASE_ADMIN_PRIVATE_KEY_BASE64` | Sim | Chave privada em Base64 (ou o JSON completo da conta em Base64) |

> **Dica:** Para gerar o Base64 da chave privada, execute:
> ```bash
> cat firebase-service-account.json | base64 -w 0
> ```
> Alternativamente, use `FIREBASE_ADMIN_PRIVATE_KEY` com a chave PEM direta (com `\n` literais).

### Monitoramento

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Não | DSN do Sentry (desativado se ausente) |
| `SENTRY_AUTH_TOKEN` | Não | Token para upload de source maps no build |

### App

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Não | URL base da aplicação |
| `NODE_ENV` | Não | `development`, `test` ou `production` (default: `development`) |

### Cron & E-mail

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `CRON_SECRET` | Sim* | Token Bearer para autenticar o cron job (`/api/cron/monthly-report`) |
| `GMAIL_USER` | Não | E-mail Gmail para envio de relatórios |
| `GMAIL_APP_PASSWORD` | Não | App Password do Gmail (não é a senha da conta) |

\* Obrigatória apenas se o cron job estiver habilitado.

## Instalação e Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/Mosfet04/controleEstoqueCentroEstetico.git
cd controleEstoqueCentroEstetico

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local   # Edite com seus valores

# 4. Execute as migrações do banco de dados
pnpm db:migrate:dev

# 5. Crie o primeiro usuário admin (seed)
#    O usuário deve existir previamente no Firebase Auth
SEED_ADMIN_FIREBASE_UID=<uid-do-firebase> \
SEED_ADMIN_EMAIL=admin@suaclinica.com \
SEED_ADMIN_NAME="Administrador" \
pnpm db:seed

# 6. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com as credenciais do admin criado no seed.

## Scripts Disponíveis

| Script | Comando | Descrição |
| --- | --- | --- |
| `dev` | `pnpm dev` | Servidor de desenvolvimento com hot reload |
| `build` | `pnpm build` | Executa migrações Prisma + build de produção Next.js |
| `start` | `pnpm start` | Inicia o servidor de produção |
| `lint` | `pnpm lint` | Linting com ESLint |
| `db:generate` | `pnpm db:generate` | Gera o Prisma Client a partir do schema |
| `db:migrate` | `pnpm db:migrate` | Aplica migrações pendentes (produção) |
| `db:migrate:dev` | `pnpm db:migrate:dev` | Cria e aplica migrações (desenvolvimento) |
| `db:push` | `pnpm db:push` | Sincroniza o schema sem criar migração |
| `db:seed` | `pnpm db:seed` | Executa o seed (cria admin inicial) |
| `db:studio` | `pnpm db:studio` | Abre o Prisma Studio (interface visual do banco) |

## Estrutura do Projeto

```
├── app/
│   ├── page.tsx                 # Tela de login
│   ├── layout.tsx               # Layout raiz (providers, metadata)
│   ├── globals.css              # Estilos globais + Tailwind
│   ├── api/                     # Rotas de API (server-side)
│   │   ├── auth/                # Autenticação (session, verify)
│   │   ├── insumos/             # CRUD de insumos
│   │   ├── saidas/              # Registro de saídas
│   │   ├── unidades/            # CRUD de unidades
│   │   ├── usuarios/            # CRUD de usuários
│   │   ├── dashboard/           # Métricas do dashboard
│   │   ├── relatorios/          # Exportação de relatórios XLSX
│   │   ├── comparativo/         # Comparativo entre unidades
│   │   ├── previsao/            # Previsão de consumo
│   │   ├── auditoria/           # Logs de auditoria
│   │   └── cron/                # Tarefas agendadas (relatório mensal)
│   └── dashboard/               # Páginas protegidas
│       ├── page.tsx             # Dashboard principal
│       ├── insumos/             # Gestão de insumos
│       ├── saidas/              # Registro de saídas
│       ├── relatorios/          # Relatórios e gráficos
│       ├── usuarios/            # Gestão de usuários (admin)
│       ├── unidades/            # Gestão de unidades (admin)
│       └── auditoria/           # Logs de auditoria (admin)
├── components/
│   ├── app-sidebar.tsx          # Navegação lateral
│   ├── install-prompt.tsx       # Prompt de instalação PWA
│   └── ui/                      # Componentes shadcn/ui
├── contexts/
│   ├── auth-context.tsx         # Provider de autenticação
│   └── unidade-context.tsx      # Provider de unidade selecionada
├── lib/
│   ├── api.ts                   # Client-side API helpers
│   ├── auth-helpers.ts          # Funções de auth server-side
│   ├── audit.ts                 # Registro de auditoria
│   ├── audit-context.ts         # AsyncLocalStorage para audit
│   ├── dashboard-data.ts        # Queries do dashboard
│   ├── email.ts                 # Envio de e-mail via Gmail
│   ├── env.ts                   # Validação de variáveis de ambiente
│   ├── firebase.ts              # Firebase Auth (client)
│   ├── firebase-admin.ts        # Firebase Admin SDK (server)
│   ├── insumo-utils.ts          # Cálculo de status do insumo
│   ├── prisma.ts                # Instância singleton do Prisma
│   ├── report-generator.ts      # Geração de relatórios Excel
│   ├── types.ts                 # Tipos compartilhados
│   ├── utils.ts                 # Utilitários gerais (cn, etc.)
│   └── validations.ts           # Schemas Zod de validação
├── prisma/
│   ├── schema.prisma            # Schema do banco de dados
│   ├── seed.ts                  # Script de seed
│   └── migrations/              # Migrações SQL
├── middleware.ts                 # Verificação de sessão em /dashboard
└── public/
    └── manifest.json            # Manifesto PWA
```

## Banco de Dados

O banco utiliza **PostgreSQL** com **Prisma ORM**. O schema define 5 modelos e 3 enums:

### Enums

| Enum | Valores | Uso |
| --- | --- | --- |
| `UserRole` | `admin`, `clinico` | Papel do usuário no sistema |
| `TipoInsumo` | `injetavel`, `descartavel`, `peeling` | Categoria do insumo |
| `TipoSaida` | `uso`, `descarte`, `ajuste` | Tipo de movimentação de saída |

### Modelos

```
┌──────────┐       M:N       ┌──────────┐
│  Unidade │◄───────────────►│   User   │
│          │                 │          │
│ id       │                 │ id       │
│ nome     │    ┌────────────│ firebase │
│ endereco │    │            │ email    │
│ telefone │    │            │ role     │
│ ativa    │    │            │ ativo    │
└──────┬───┘    │            └────┬─────┘
       │        │                 │
       │ 1:N    │ 1:N             │ 1:N
       ▼        ▼                 ▼
┌──────────────────┐      ┌──────────────┐
│     Insumo       │      │   AuditLog   │
│                  │      │              │
│ nome, lote, tipo │      │ action       │
│ fornecedor       │      │ entity       │
│ quantidade       │      │ entityId     │
│ quantidadeMinima │      │ details      │
│ dataVencimento   │      └──────────────┘
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│   SaidaInsumo    │
│                  │
│ quantidade       │
│ tipo (uso/desc)  │
│ motivo           │
│ dataRetirada     │
└──────────────────┘
```

- **Unidade** — Unidade/filial da clínica. Relaciona-se M:N com User e 1:N com Insumo e SaidaInsumo.
- **User** — Usuário do sistema com vínculo ao Firebase Auth via `firebaseUid`. Pode estar em múltiplas unidades.
- **Insumo** — Item de estoque (produto). Contém lote, validade, quantidade e quantidade mínima.
- **SaidaInsumo** — Registro de movimentação (uso clínico, descarte ou ajuste). Referencia o insumo, o usuário responsável e a unidade.
- **AuditLog** — Trilha de auditoria automática. Registra ações (CREATE, UPDATE, DELETE, DEACTIVATE, REACTIVATE) com detalhes em JSON.

## Rotas da API

### Autenticação

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| POST | `/api/auth/session` | — | Cria sessão (recebe idToken Firebase, define cookie HttpOnly) |
| DELETE | `/api/auth/session` | — | Encerra sessão (limpa cookie) |
| POST | `/api/auth/verify` | Interno | Verifica token Firebase (usado pelo middleware) |

### Insumos

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/insumos` | Autenticado | Lista insumos com filtros (`q`, `tipo`) |
| POST | `/api/insumos` | Autenticado | Cria novo insumo |
| GET | `/api/insumos/[id]` | Autenticado | Detalhe do insumo |
| PUT | `/api/insumos/[id]` | Autenticado | Atualiza insumo |
| DELETE | `/api/insumos/[id]` | Autenticado | Exclui insumo (falha se houver saídas) |

### Saídas

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/saidas` | Autenticado | Lista saídas da unidade |
| POST | `/api/saidas` | Autenticado | Registra saída (transação atômica: verifica estoque → decrementa → cria registro) |

### Unidades

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/unidades` | Autenticado | Lista unidades (admin: todas; clínico: apenas vinculadas) |
| POST | `/api/unidades` | Admin | Cria nova unidade |
| GET | `/api/unidades/[id]` | Admin | Detalhe da unidade com usuários vinculados |
| PUT | `/api/unidades/[id]` | Admin | Atualiza unidade |
| DELETE | `/api/unidades/[id]` | Admin | Desativa unidade (soft delete) |

### Usuários

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/usuarios` | Admin | Lista todos os usuários |
| POST | `/api/usuarios` | Admin | Cria usuário (Firebase Auth + banco) |
| PUT | `/api/usuarios/[id]` | Admin | Atualiza dados (sincroniza e-mail com Firebase) |
| DELETE | `/api/usuarios/[id]` | Admin | Desativa ou exclui (conforme histórico) |

### Dashboard, Relatórios e Análises

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | Autenticado | Métricas completas (KPIs, distribuições, top itens, alertas) |
| GET | `/api/relatorios/export` | Autenticado | Exporta relatório XLSX com 9 abas |
| GET | `/api/comparativo` | Admin | Comparativo cross-unidade |
| GET | `/api/previsao` | Autenticado | Previsão de consumo (média 90 dias → dias restantes) |
| GET | `/api/auditoria` | Admin | Logs de auditoria com filtros |

### Cron

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/cron/monthly-report` | Bearer (CRON_SECRET) | Envia relatório XLSX mensal por e-mail a todos os admins |

> Todas as rotas autenticadas requerem o header `x-unidade-id` com o ID da unidade selecionada. Admins podem omitir para visão global.

## Autenticação e Autorização

### Fluxo de Login

```
Browser                           Server
  │                                  │
  │  signInWithEmailAndPassword()    │
  │  ou signInWithPopup(Google)      │
  │                                  │
  │  ── POST /api/auth/session ────► │  verifyIdToken(idToken)
  │     { idToken }                  │  findUser(firebaseUid)
  │                                  │  set cookie __session (HttpOnly, 1h)
  │  ◄── { id, name, role } ─────── │
  │                                  │
  │  ── GET /dashboard ────────────► │  middleware: verifica __session
  │     cookie: __session            │  → /api/auth/verify
  │                                  │  define headers x-user-uid, x-user-email
  │  ◄── page ──────────────────── │
```

### Papéis

| Papel | Acesso |
| --- | --- |
| `admin` | Acesso total: todas as unidades, gestão de usuários, unidades, auditoria, comparativo |
| `clinico` | Acesso restrito às unidades vinculadas. Pode visualizar/registrar insumos e saídas, ver relatórios |

### Controle de Acesso por Unidade

- O header `x-unidade-id` é enviado automaticamente pelo client em cada request.
- `requireUnidadeAccess()` verifica se o usuário (clínico) é membro da unidade.
- Admins têm acesso irrestrito a qualquer unidade.

### Vinculação de Conta

Usuários que já possuem login por senha podem vincular a conta Google: ao tentar login com Google, o sistema detecta a conta existente e solicita a senha para concluir a vinculação automaticamente.

## Auditoria

O sistema registra automaticamente todas as operações de escrita via `withAuditContext()`:

| Entidade | Ações Rastreadas |
| --- | --- |
| `insumo` | CREATE, UPDATE, DELETE |
| `saida` | CREATE |
| `usuario` | CREATE, UPDATE, DELETE, DEACTIVATE, REACTIVATE |
| `unidade` | CREATE, UPDATE, DELETE (desativação) |

Cada registro contém: usuário responsável, timestamp, ID da entidade afetada e detalhes em JSON (nome, e-mail, quantidades, etc.). Falhas no registro de auditoria nunca interrompem a operação principal.

## Monitoramento (Sentry)

| Runtime | Sample Rate (prod) | Sample Rate (dev) | Extras |
| --- | --- | --- | --- |
| Client | 10% traces | 100% | Session Replay: 5% normal, 100% em erros |
| Server | 10% traces | 100% | — |
| Edge | 10% traces | 100% | — |

- Source maps são enviados ao Sentry durante o build (requer `SENTRY_AUTH_TOKEN`).
- O `instrumentation.ts` carrega a configuração correta conforme o runtime (Node.js ou Edge).

## Deploy e Produção

O projeto está configurado para deploy na **Vercel**:

- **Build:** `prisma migrate deploy && next build` (migrações são aplicadas automaticamente no deploy)
- **Cron Job:** Relatório mensal enviado no dia 1 de cada mês às 01:00 UTC (configurado em `vercel.json`)
- **Security Headers** (via `next.config.mjs`):
  - `Strict-Transport-Security` (HSTS, 2 anos)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - CSP restritiva com domínios Firebase e Sentry explícitos

## PWA

A aplicação é instalável como Progressive Web App:

- **Manifest:** `public/manifest.json` — nome "Stock Beauty Clinic", tema roxo (`#7c3aed`), ícones 192px e 512px
- **Install Prompt:** Componente customizado que aparece após 3 segundos — instruções específicas para iOS (manual) e Android (nativo)
- **Display:** `standalone` com orientação portrait

---

# Para Usuários

## Visão Geral do Sistema

O **Stock Beauty Clinic** é um sistema de controle de estoque desenvolvido para clínicas e centros estéticos. Com ele, sua equipe pode:

- Cadastrar e acompanhar todos os insumos (injetáveis, descartáveis, peelings)
- Controlar a validade dos produtos e receber alertas antes do vencimento
- Registrar o uso clínico, descartes e ajustes de estoque
- Gerar relatórios detalhados com exportação para Excel
- Gerenciar múltiplas unidades/filiais a partir de um único painel

O sistema possui dois perfis de acesso:

- **Administrador** — acesso completo: gerencia usuários, unidades, visualiza auditoria e compara dados entre filiais
- **Clínico** — acesso às unidades vinculadas: registra entradas, saídas e visualiza relatórios

## Login e Acesso

Ao abrir o sistema, você verá a tela de login com duas opções:

### Login com E-mail e Senha

1. Digite o e-mail e a senha fornecidos pelo administrador
2. Clique em **Entrar**
3. Você será redirecionado ao painel principal

### Login com Google

1. Clique em **Entrar com Google**
2. Selecione sua conta Google na janela que será aberta
3. Você será redirecionado ao painel principal

### Vincular Conta Google (primeira vez)

Se o administrador criou sua conta com e-mail e senha, e você deseja também usar o Google para login:

1. Clique em **Entrar com Google**
2. O sistema detectará que seu e-mail já possui login por senha
3. Um aviso azul aparecerá pedindo para confirmar com sua senha
4. Digite sua senha e clique em **Entrar**
5. A partir de agora, ambos os métodos funcionarão

### Esqueceu a Senha?

1. Digite seu e-mail no campo de e-mail
2. Clique em **Esqueceu a senha?**
3. Verifique sua caixa de entrada (e a pasta de spam) para o link de redefinição

## Painel Principal (Dashboard)

O dashboard apresenta um resumo visual do estado do seu estoque:

### Indicadores (Cards)

| Card | O que mostra |
| --- | --- |
| **Total de Insumos** | Quantidade total de itens cadastrados e quantos estão ativos |
| **Estoque Crítico** | Itens com quantidade abaixo do mínimo ou vencidos — requerem reposição imediata |
| **Vencendo em 30 dias** | Itens que vão vencer nos próximos 30 dias + quantos já estão vencidos |
| **Uso Clínico Mês** | Total de saídas do tipo "uso" no mês atual |
| **Descartes Mês** | Total de descartes no mês — útil para avaliar desperdício |
| **Ajustes Mês** | Total de ajustes de estoque no mês |

### Gráficos

- **Por Tipo** — Distribuição dos insumos entre Injetável, Descartável e Peeling
- **Por Status** — Distribuição entre os estados: Bom (verde), Atenção (amarelo) e Crítico (vermelho)

### Alertas

- **Vencendo em Breve** — Lista dos insumos próximos da validade com a quantidade de dias restantes
- **Estoque Baixo** — Itens em nível crítico que precisam de reposição

## Gerenciamento de Insumos

Acesse pelo menu lateral: **Insumos**

### Visualização

A tela exibe uma tabela com todos os insumos da unidade selecionada, incluindo: nome, lote, tipo, fornecedor, quantidade atual, quantidade mínima, datas de entrada e vencimento.

### Indicador de Status

Cada insumo recebe automaticamente um dos três status:

| Status | Cor | Significado |
| --- | --- | --- |
| **Bom** | Verde | Estoque adequado e dentro da validade |
| **Atenção** | Amarelo | Quantidade próxima do mínimo ou vencimento em até 30 dias |
| **Crítico** | Vermelho | Estoque abaixo de 30% do mínimo, vencido ou zerado |

### Busca e Filtros

- **Busca por texto** — Pesquise por nome, lote ou fornecedor
- **Filtro por tipo** — Injetável, Descartável ou Peeling
- **Filtro por status** — Bom, Atenção ou Crítico

### Cadastrar Novo Insumo

1. Clique em **Novo Insumo**
2. Preencha os campos:
   - **Unidade** — Selecione a unidade (obrigatório)
   - **Nome** — Nome do produto (obrigatório)
   - **Lote** — Número do lote (obrigatório)
   - **Tipo** — Injetável, Descartável ou Peeling
   - **Fornecedor** — Nome do fornecedor
   - **Quantidade** — Quantidade em estoque
   - **Quantidade Mínima** — Quantidade que aciona o alerta de reposição
   - **Data de Entrada** — Data de recebimento
   - **Data de Vencimento** — Validade do produto (obrigatório)
3. Clique em **Salvar**

### Editar e Excluir

- Para editar, clique no ícone de edição na linha do insumo
- Para excluir, clique no ícone de exclusão — isso só é possível se o insumo **não tiver saídas registradas**

## Registro de Saídas

Acesse pelo menu lateral: **Saídas**

Sempre que um insumo for utilizado, descartado ou precisar de ajuste, registre uma saída:

### Tipos de Saída

| Tipo | Quando usar | Motivo obrigatório |
| --- | --- | --- |
| **Uso Clínico** | Insumo foi utilizado em procedimento | Não |
| **Descarte** | Insumo vencido, avariado ou contaminado | Sim (escolha o motivo: Produto vencido, Avaria/Quebra, Contaminação, Outro) |
| **Ajuste** | Correção de estoque por divergência | Sim (escolha o motivo: Uso sem cadastro, Erro de contagem anterior, Desvio não registrado, Outro) |

### Como Registrar

1. Clique em **Nova Saída**
2. Selecione a **Unidade**
3. Escolha o **Tipo de Saída**
4. Se for Descarte ou Ajuste, selecione o **Motivo**
5. Selecione o **Insumo** (só aparecem itens com estoque disponível)
6. Informe a **Quantidade**
7. Opcionalmente, adicione uma **Observação**
8. Clique em **Registrar**

O estoque do insumo será decrementado automaticamente. O sistema impede retiradas acima do estoque disponível.

### Histórico

A tabela de saídas mostra todas as movimentações com: insumo, tipo, quantidade, responsável e data. Use a busca e os filtros para encontrar registros específicos.

## Relatórios

Acesse pelo menu lateral: **Relatórios**

### Filtro por Período

Selecione a data inicial e final no topo da página e clique em **Filtrar**. Por padrão, exibe o mês atual.

### Métricas Resumidas

Oito indicadores no topo: Total de Insumos, Estoque Crítico, Vencendo (30d), Saídas no Mês, Descartes, Ajustes, Vencidos e Estoque Zerado.

### Gráficos e Tabelas

- **Distribuição por Tipo** — Gráfico pizza (Injetável / Descartável / Peeling)
- **Distribuição por Status** — Gráfico pizza (Bom / Atenção / Crítico)
- **Top Consumo** — Gráfico de barras com os 5 insumos mais consumidos
- **Top Descartes** — Itens com maior volume de descarte e motivos
- **Volume por Tipo de Saída** — Proporção entre Uso Clínico, Descarte e Ajuste
- **Atividade por Colaborador** — Movimentações de cada membro da equipe
- **Vencendo em 60 dias** — Tabela de produtos próximos do vencimento
- **Itens Críticos** — Tabela de produtos com estoque baixo
- **Fornecedores** — Dados dos principais fornecedores
- **Atividade Recente** — Últimas movimentações registradas

### Exportar para Excel

Clique em **Exportar XLSX** para baixar um arquivo Excel com 9 abas contendo todos os dados do período selecionado: Resumo, Por Tipo, Por Status, Top Consumo, Volume por Tipo de Saída, Por Colaborador, Top Descartes, Estoque Zerado e Fornecedores.

## Administração: Usuários

> Acesso exclusivo para **administradores**.

Acesse pelo menu lateral: **Usuários**

### Criar Novo Usuário

1. Clique em **Novo Usuário**
2. Preencha:
   - **Nome** (obrigatório)
   - **E-mail** (obrigatório, deve ser único)
   - **Senha** (mínimo 8 caracteres)
   - **Função** — Administrador ou Clínico
   - **Unidades** — Selecione quais unidades este usuário poderá acessar
3. Clique em **Salvar**

O usuário receberá suas credenciais e poderá fazer login imediatamente.

### Editar Usuário

Permite alterar nome, e-mail, função e unidades vinculadas. A senha só pode ser redefinida pelo próprio usuário via "Esqueceu a senha?".

### Desativar / Excluir

- Se o usuário possui histórico de saídas, ele será **desativado** (não consegue mais entrar, mas o histórico é preservado)
- Se não possui histórico, será **excluído** permanentemente (incluindo do Firebase)
- Não é possível excluir o próprio usuário logado

### Reativar

Usuários desativados podem ser reativados pelo administrador, restaurando o acesso.

## Administração: Unidades

> Acesso exclusivo para **administradores**.

Acesse pelo menu lateral: **Unidades**

### Criar Nova Unidade

1. Clique em **Nova Unidade**
2. Preencha:
   - **Nome** (obrigatório) — Ex: "Unidade Centro", "Filial Shopping"
   - **Endereço** (opcional)
   - **Telefone** (opcional)
3. Clique em **Salvar**

### Editar e Desativar

- Edite nome, endereço ou telefone a qualquer momento
- Ao excluir, a unidade é **desativada** (não aparece mais para seleção, mas os dados históricos são mantidos)

## Administração: Auditoria

> Acesso exclusivo para **administradores**.

Acesse pelo menu lateral: **Auditoria**

O log de auditoria registra automaticamente todas as ações realizadas no sistema:

### Filtros Disponíveis

- **Período** — Data inicial e final
- **Entidade** — Insumo, Saída, Usuário, Unidade ou Todas
- **Ação** — Criação, Atualização, Exclusão, Desativação, Reativação ou Todas

### Informações do Log

Cada registro mostra:
- **Entidade** afetada (com ícone identificador)
- **Ação** realizada (codificada por cor: verde = criação, azul = atualização, vermelho = exclusão)
- **Detalhes** — nome do item, quantidades, tipo, etc.
- **Responsável** — quem realizou a ação
- **Data e hora** — quando ocorreu

## Seletor de Unidade

No menu lateral (sidebar), no topo, há o seletor de unidade ativa:

- **Clínico** — Vê apenas as unidades às quais está vinculado. Deve selecionar uma para operar.
- **Administrador** — Pode selecionar qualquer unidade ativa ou escolher **"Todas as unidades"** para uma visão global consolidada.

Ao trocar de unidade, todos os dados exibidos (dashboard, insumos, saídas, relatórios) são atualizados automaticamente. A seleção é salva no navegador e mantida entre sessões.

## Instalar como Aplicativo (PWA)

O sistema pode ser instalado no celular ou computador como um aplicativo:

### Android / Chrome

1. Ao acessar o sistema, um aviso aparecerá na parte inferior da tela
2. Clique em **Instalar**
3. O app será adicionado à tela inicial do dispositivo

### iPhone / iPad (Safari)

1. Abra o sistema no Safari
2. Toque no ícone de **Compartilhar** (quadrado com seta para cima)
3. Role para baixo e toque em **Adicionar à Tela de Início**
4. Confirme tocando em **Adicionar**

Após instalado, o sistema abre em tela cheia, como um aplicativo nativo.

---

## Licença

Este projeto é proprietário. Todos os direitos reservados.

## Suporte

Para dúvidas ou suporte técnico, entre em contato com o administrador do sistema.
