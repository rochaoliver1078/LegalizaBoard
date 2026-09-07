-- =============================================================
-- MIGRAÇÃO 002 — Migração dos dados legados (owner_uid → workspace_id)
--
-- CONTEXTO
--   No modelo antigo, cada workspace era identificado por um
--   owner_uid TEXT no formato 'user:email' (ou o próprio e-mail),
--   e a tabela app_config guardava — em texto puro — as senhas
--   dos usuários dentro de payload.password / payload.allowedMembers.
--
-- ⚠️  AS SENHAS ANTIGAS NÃO SÃO MIGRADAS.
--   Elas estavam armazenadas em texto puro e devem ser consideradas
--   comprometidas. Cada usuário deve redefinir a senha pelo fluxo
--   "Esqueci minha senha" na tela de login (Supabase Auth envia o
--   e-mail de redefinição com hash bcrypt do lado do servidor).
--
-- PRÉ-REQUISITO (manual, antes de executar este script):
--   Para cada dono de workspace antigo, crie o usuário no Supabase
--   Auth com o MESMO e-mail do owner_uid legado:
--     Painel → Authentication → Users → "Add user" / "Invite user",
--     ou via Admin API:
--       curl -X POST 'https://<proj>.supabase.co/auth/v1/admin/users' \
--         -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
--         -H 'Content-Type: application/json' \
--         -d '{"email":"fulano@exemplo.com","email_confirm":true}'
--   O trigger handle_new_user criará automaticamente um workspace
--   para cada usuário sem convite pendente.
--
-- O QUE ESTE SCRIPT FAZ
--   Para cada owner_uid distinto nas tabelas de dados:
--     1. Extrai o e-mail ('user:email' → email).
--     2. Localiza o usuário em auth.users.
--     3. Localiza (ou cria) o workspace desse usuário.
--     4. Atualiza processos/tarefas/listas_tarefas com workspace_id.
--     5. Copia a configuração de app_config para workspace_config,
--        DESCARTANDO os campos de credenciais (password,
--        allowedMembers com senhas etc.).
-- =============================================================

DO $$
DECLARE
    legado      RECORD;
    email_dono  TEXT;
    uid_dono    UUID;
    ws_id       UUID;
    cfg_payload JSONB;
BEGIN
    FOR legado IN
        SELECT DISTINCT owner_uid FROM (
            SELECT owner_uid FROM public.processos      WHERE owner_uid IS NOT NULL AND workspace_id IS NULL
            UNION
            SELECT owner_uid FROM public.tarefas        WHERE owner_uid IS NOT NULL AND workspace_id IS NULL
            UNION
            SELECT owner_uid FROM public.listas_tarefas WHERE owner_uid IS NOT NULL AND workspace_id IS NULL
        ) t
    LOOP
        -- 'user:email' → email; caso contrário assume que já é o e-mail
        email_dono := CASE
            WHEN legado.owner_uid LIKE 'user:%' THEN substring(legado.owner_uid FROM 6)
            ELSE legado.owner_uid
        END;

        SELECT id INTO uid_dono
        FROM auth.users
        WHERE lower(email) = lower(email_dono)
        LIMIT 1;

        IF uid_dono IS NULL THEN
            RAISE WARNING 'Usuário % não existe em auth.users — crie-o primeiro (ver cabeçalho). Pulando owner_uid %.',
                email_dono, legado.owner_uid;
            CONTINUE;
        END IF;

        -- Workspace do dono (criado pelo trigger no cadastro; cria se faltar)
        SELECT id INTO ws_id
        FROM public.workspaces
        WHERE owner_id = uid_dono
        LIMIT 1;

        IF ws_id IS NULL THEN
            INSERT INTO public.workspaces (owner_id, nome)
            VALUES (uid_dono, split_part(email_dono, '@', 1))
            RETURNING id INTO ws_id;
        END IF;

        UPDATE public.processos      SET workspace_id = ws_id WHERE owner_uid = legado.owner_uid AND workspace_id IS NULL;
        UPDATE public.tarefas        SET workspace_id = ws_id WHERE owner_uid = legado.owner_uid AND workspace_id IS NULL;
        UPDATE public.listas_tarefas SET workspace_id = ws_id WHERE owner_uid = legado.owner_uid AND workspace_id IS NULL;

        -- Configuração: copia de app_config removendo credenciais
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'app_config') THEN
            SELECT payload INTO cfg_payload
            FROM public.app_config
            WHERE id = legado.owner_uid OR id = email_dono
            LIMIT 1;

            IF cfg_payload IS NOT NULL THEN
                INSERT INTO public.workspace_config (workspace_id, payload)
                VALUES (
                    ws_id,
                    (cfg_payload - 'password' - 'allowedMembers' - 'adminPassword' - 'users')
                )
                ON CONFLICT (workspace_id) DO NOTHING;
            END IF;
        END IF;

        RAISE NOTICE 'Migrado: % → workspace %', legado.owner_uid, ws_id;
    END LOOP;
END $$;

-- =============================================================
-- PÓS-MIGRAÇÃO (executar manualmente após conferir os dados):
--
--   -- Confira se sobrou algo sem workspace:
--   SELECT count(*) FROM public.processos      WHERE workspace_id IS NULL;
--   SELECT count(*) FROM public.tarefas        WHERE workspace_id IS NULL;
--   SELECT count(*) FROM public.listas_tarefas WHERE workspace_id IS NULL;
--
--   -- Então remova as colunas legadas e a tabela de credenciais:
--   -- ALTER TABLE public.processos      DROP COLUMN owner_uid;
--   -- ALTER TABLE public.tarefas        DROP COLUMN owner_uid;
--   -- ALTER TABLE public.listas_tarefas DROP COLUMN owner_uid;
--   -- DROP TABLE public.app_config;   -- continha senhas em texto puro
-- =============================================================
