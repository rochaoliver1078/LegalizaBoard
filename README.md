# LegalizaBoard — Gestão Societária

Aplicação web para gestão de processos de **legalização societária**: acompanhamento
de trâmites na **JUCESP** e prefeitura, controle de **exigências** (com prazo de 30
dias), tarefas vinculadas, alarmes, anexos, relatórios e trilha de auditoria — pensada
para o dia a dia de um escritório contábil que administra a legalização de dezenas de
clientes.

Principais recursos:

- **Quadro Kanban** e grade em tabela dos processos, com filtros por tipo e busca.
- **Trilhas de fases** por tipo de processo (abertura, alteração, baixa, transformação,
  ata, licenciamento, inscrição municipal), com checklists e orquestração de tarefas.
- **Exigências JUCESP** com contagem regressiva, alarmes automáticos e destaque de prazo.
- **Consulta pública de CNPJ** (BrasilAPI) com pré-preenchimento e conferência de QSA.
- **Exportação** em Excel (.xlsx) e CSV, além de aba de **Relatório** por tipo.
- **Multiusuário** com papéis (admin / editor / visualizador) e convites por e-mail.
- **Tempo real**: mudanças de outro analista aparecem sem recarregar; detecção básica
  de conflito de edição.
- **Trilha de auditoria** com autoria (quem fez cada ação) e carimbo de data-hora.
- **PWA** instalável, com cache offline básico.

## Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4**
- **Supabase** (Auth, Postgres com RLS, Storage, Realtime)
- **lucide-react** (ícones), **xlsx** (exportação)
- **vite-plugin-pwa** (service worker / manifest)
- **Vitest** (testes unitários)

## Pré-requisitos

- **Node.js 20+** e npm
- Um projeto **Supabase** (plano gratuito serve)

## Variáveis de ambiente

Crie um arquivo **`.env.local`** na raiz (veja `.env.example`):

```bash
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_ANON_KEY_AQUI"
```

Os dois valores estão no painel do Supabase em **Project Settings → API**.
A `anon key` é **pública por design** — a segurança vem do Supabase Auth + RLS, nunca
do sigilo dessa chave. **Nunca** coloque a `service_role key` no frontend.

## Configuração do Supabase

### 1. Aplicar as migrations SQL (na ordem)

No painel do Supabase, abra **SQL Editor** e execute os arquivos de
`supabase/migrations/` **em ordem**:

1. **`001_auth_workspaces.sql`** — cria `workspaces`, `workspace_members`,
   `convites_pendentes`, `workspace_config`, as funções auxiliares
   (`is_workspace_member`, `workspace_role`), o trigger de onboarding
   (`handle_new_user`) e todas as políticas de RLS.
2. **`002_migrar_dados.sql`** — *(opcional)* migra dados legados de `owner_uid`
   (e-mail) para `workspace_id`. Use apenas se estiver migrando de uma base antiga;
   leia o cabeçalho do arquivo antes de rodar. Em uma instalação nova, pule.
3. **`003_storage_anexos.sql`** — cria o bucket privado `anexos` e as políticas de
   Storage para upload/download por membros do workspace.
4. **`004_realtime.sql`** — habilita o Realtime nas tabelas `processos` e `tarefas`.

Cada migration é **idempotente** — pode ser reexecutada sem efeitos colaterais.

### 2. Habilitar Email/Password no Auth

Em **Authentication → Providers → Email**, mantenha o provedor **Email** habilitado.
Para desenvolvimento você pode desativar "Confirm email" (**Authentication → Sign In /
Providers**) para logar sem confirmar o e-mail; em produção, mantenha a confirmação
ativada. O primeiro usuário pode ser criado pela própria tela de cadastro do app — o
trigger `handle_new_user` cria automaticamente um workspace para ele.

## Rodando localmente

```bash
npm install
npm run dev
```

O app sobe em `http://localhost:3000`.

## Build e deploy

### Build local

```bash
npm run build      # gera dist/ (inclui o service worker do PWA)
npm run preview    # serve o build para conferência
```

### Deploy na Vercel

1. Importe o repositório em [vercel.com](https://vercel.com) (framework detectado: **Vite**).
2. Em **Settings → Environment Variables**, defina `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
3. Build command `npm run build`, output `dist` (padrão do Vite). O `vercel.json`
   já configura o *rewrite* de SPA (todas as rotas → `index.html`).

## Verificação (lint, tipos e build)

```bash
npm run lint         # tsc --noEmit (checagem de tipos, com strict mode)
npm run lint:eslint  # ESLint (flat config)
npm run test         # Vitest — testes unitários das regras de negócio puras
npm run build        # build de produção
```

## Estrutura de pastas

```
public/                 Ícones do PWA e ativos estáticos
scripts/                Utilitários de build (gerador de ícones)
supabase/migrations/    Migrations SQL (001 → 004)
src/
  App.tsx               Composição de layout e roteamento de abas
  main.tsx              Entrada; monta o ErrorBoundary
  components/           Componentes de UI
    tarefas/            Módulo do gestor de tarefas
  hooks/                Hooks de domínio (sessão, processos, tarefas, realtime…)
  lib/                  Integrações (Supabase, Storage, consulta CNPJ, cache local)
  utils/                Regras puras (helpers, exigências, documentos, exportação)
  data/                 Modelos de trilhas/fases e dados semente
  types.ts, types/      Tipos compartilhados
```

## PWA (Progressive Web App)

O app é instalável e funciona com cache offline básico (vite-plugin-pwa,
`registerType: 'autoUpdate'`).

- **Shell offline**: precache dos assets do build.
- **Supabase REST**: runtime cache `NetworkFirst` apenas para GET em `/rest/v1/`
  (rede primeiro, cache como fallback offline).
- **Instalação**: a Sidebar mostra "Instalar aplicativo" quando o navegador dispara
  `beforeinstallprompt`.

### Ícones

Os ícones (`public/pwa-192x192.png`, `public/pwa-512x512.png`,
`public/maskable-512x512.png`, `public/favicon-64.png`) são gerados sem dependências
externas — a marca LegalizaBoard (duas barras arredondadas formando um "L") em branco
sobre fundo `#d93025`:

```bash
node scripts/gen-icons.mjs
```

`public/icon.svg` é a versão vetorial de referência. Para regenerar os PNGs a partir
dele com outra ferramenta (ex.: ImageMagick):

```bash
convert -background none public/icon.svg -resize 192x192 public/pwa-192x192.png
convert -background none public/icon.svg -resize 512x512 public/pwa-512x512.png
```
