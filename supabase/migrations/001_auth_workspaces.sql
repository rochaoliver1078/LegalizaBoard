-- =============================================================
-- MIGRAÇÃO 001 — Supabase Auth nativo + workspaces + RLS
--
-- Substitui por completo o modelo antigo baseado no header
-- 'x-osc-owner-uid' (forjável pelo cliente) e na tabela
-- app_config com SELECT USING (true) que expunha senhas.
--
-- Idempotente: pode ser executada mais de uma vez.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. LIMPEZA — função e políticas do modelo antigo
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_claim_owner_uid() CASCADE;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('processos', 'tarefas', 'listas_tarefas', 'app_config')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. TABELAS BASE (criadas caso o banco esteja vazio)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processos (
    id          TEXT PRIMARY KEY,
    owner_uid   TEXT,                -- legado; removível após migração 002
    payload     JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tarefas (
    id          TEXT PRIMARY KEY,
    owner_uid   TEXT,                -- legado; removível após migração 002
    processo_id TEXT,
    fase_id     TEXT,
    item_key    TEXT,
    payload     JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.listas_tarefas (
    id          TEXT PRIMARY KEY,
    owner_uid   TEXT,                -- legado; removível após migração 002
    payload     JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 2. WORKSPACES, MEMBROS E CONVITES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'visualizador')),
    convidado_email TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Convites para e-mails que ainda não possuem conta.
-- Consumidos pelo trigger handle_new_user no momento do cadastro.
CREATE TABLE IF NOT EXISTS public.convites_pendentes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    role         TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'visualizador')),
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (workspace_id, email)
);

-- Configuração por workspace. Substitui app_config, que misturava
-- credenciais com configuração — credenciais deixam de existir.
CREATE TABLE IF NOT EXISTS public.workspace_config (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payload      JSONB NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 3. COLUNA workspace_id NAS TABELAS DE DADOS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.processos      ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.tarefas        ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.listas_tarefas ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- ─────────────────────────────────────────────────────────────
-- 4. ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_processos_ws  ON public.processos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_ws    ON public.tarefas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_proc  ON public.tarefas(processo_id);
CREATE INDEX IF NOT EXISTS idx_listas_ws     ON public.listas_tarefas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_owner      ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_wm_user       ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_convites_email ON public.convites_pendentes(lower(email));

-- ─────────────────────────────────────────────────────────────
-- 5. FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão de RLS)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = ws AND w.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = ws AND m.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(ws UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = ws AND w.owner_id = auth.uid()
        ) THEN 'admin'
        ELSE (
            SELECT m.role FROM public.workspace_members m
            WHERE m.workspace_id = ws AND m.user_id = auth.uid()
        )
    END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER DE ONBOARDING — auth.users AFTER INSERT
--    Convidado: entra nos workspaces dos convites.
--    Sem convite: ganha um workspace próprio como owner.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    convite RECORD;
    encontrou_convite BOOLEAN := false;
BEGIN
    FOR convite IN
        SELECT id, workspace_id, role
        FROM public.convites_pendentes
        WHERE lower(email) = lower(NEW.email)
    LOOP
        encontrou_convite := true;
        INSERT INTO public.workspace_members (workspace_id, user_id, role, convidado_email)
        VALUES (convite.workspace_id, NEW.id, convite.role, NEW.email)
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
        DELETE FROM public.convites_pendentes WHERE id = convite.id;
    END LOOP;

    IF NOT encontrou_convite THEN
        INSERT INTO public.workspaces (owner_id, nome)
        VALUES (NEW.id, split_part(NEW.email, '@', 1));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 7. ATIVAR RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.processos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_tarefas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_pendentes ENABLE ROW LEVEL SECURITY;

-- app_config legada: se existir, tranca por completo (sem policies,
-- RLS ativo = nenhum acesso via API). Dados migram na migração 002.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'app_config') THEN
        EXECUTE 'ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. POLICIES — workspaces
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS ws_select ON public.workspaces;
DROP POLICY IF EXISTS ws_insert ON public.workspaces;
DROP POLICY IF EXISTS ws_update ON public.workspaces;
DROP POLICY IF EXISTS ws_delete ON public.workspaces;

CREATE POLICY ws_select ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id));
CREATE POLICY ws_insert ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());
CREATE POLICY ws_update ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());
CREATE POLICY ws_delete ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 9. POLICIES — workspace_members
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS wm_select ON public.workspace_members;
DROP POLICY IF EXISTS wm_insert ON public.workspace_members;
DROP POLICY IF EXISTS wm_update ON public.workspace_members;
DROP POLICY IF EXISTS wm_delete ON public.workspace_members;

CREATE POLICY wm_select ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));
CREATE POLICY wm_insert ON public.workspace_members FOR INSERT
    WITH CHECK (public.workspace_role(workspace_id) = 'admin');
CREATE POLICY wm_update ON public.workspace_members FOR UPDATE
    USING (public.workspace_role(workspace_id) = 'admin');
CREATE POLICY wm_delete ON public.workspace_members FOR DELETE
    USING (public.workspace_role(workspace_id) = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 10. POLICIES — convites_pendentes
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS conv_select_admin   ON public.convites_pendentes;
DROP POLICY IF EXISTS conv_select_proprio ON public.convites_pendentes;
DROP POLICY IF EXISTS conv_insert         ON public.convites_pendentes;
DROP POLICY IF EXISTS conv_delete         ON public.convites_pendentes;

CREATE POLICY conv_select_admin ON public.convites_pendentes FOR SELECT
    USING (public.workspace_role(workspace_id) = 'admin');
-- Convidado enxerga o próprio convite
CREATE POLICY conv_select_proprio ON public.convites_pendentes FOR SELECT
    USING (lower(email) = lower(auth.jwt() ->> 'email'));
CREATE POLICY conv_insert ON public.convites_pendentes FOR INSERT
    WITH CHECK (public.workspace_role(workspace_id) = 'admin');
CREATE POLICY conv_delete ON public.convites_pendentes FOR DELETE
    USING (public.workspace_role(workspace_id) = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 11. POLICIES — tabelas de dados
--     SELECT: qualquer membro | INSERT/UPDATE: admin+editor
--     DELETE: só admin
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['processos', 'tarefas', 'listas_tarefas', 'workspace_config']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_sel ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_ins ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_upd ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_del ON public.%I', tbl, tbl);

        EXECUTE format(
            'CREATE POLICY %I_sel ON public.%I FOR SELECT USING (public.is_workspace_member(workspace_id))',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY %I_ins ON public.%I FOR INSERT WITH CHECK (public.workspace_role(workspace_id) IN (''admin'', ''editor''))',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY %I_upd ON public.%I FOR UPDATE USING (public.workspace_role(workspace_id) IN (''admin'', ''editor''))',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY %I_del ON public.%I FOR DELETE USING (public.workspace_role(workspace_id) = ''admin'')',
            tbl, tbl);
    END LOOP;
END $$;
