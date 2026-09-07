-- =============================================================
-- MIGRAÇÃO 004 — Habilitar Realtime nas tabelas de dados
--
-- Adiciona processos e tarefas à publicação supabase_realtime
-- para que os clientes recebam INSERT/UPDATE/DELETE via canal.
-- Idempotente: verifica antes de adicionar.
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = 'processos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.processos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = 'tarefas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;
    END IF;
END $$;
