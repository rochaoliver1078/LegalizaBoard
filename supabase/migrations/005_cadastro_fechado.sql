-- =============================================================
-- MIGRAÇÃO 005 — CADASTRO FECHADO (somente convidados)
--
-- Torna o sistema fechado: só quem tem um convite pendente
-- (criado por um admin na tela "Controle de Acesso") obtém acesso.
-- Ninguém se cadastra por conta própria.
--
--   • E-mail COM convite  → entra nos workspaces do convite.
--   • E-mail SEM convite  → o cadastro é REJEITADO (RAISE EXCEPTION).
--
-- Não afeta usuários/workspaces já existentes — só altera o que
-- acontece em NOVOS cadastros. Idempotente.
-- =============================================================

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

    -- SISTEMA FECHADO: sem convite, não há acesso. Bloqueia o cadastro.
    IF NOT encontrou_convite THEN
        RAISE EXCEPTION 'Cadastro restrito a convidados. Solicite um convite ao administrador.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;
