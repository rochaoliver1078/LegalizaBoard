-- =============================================================
-- MIGRAÇÃO 003 — Supabase Storage para anexos de documentos
--
-- Substitui o armazenamento de arquivos como DataURL base64
-- dentro do JSONB de processos. Estrutura de path:
--   {workspaceId}/{processoId}/{faseId}/{timestamp}-{nomeArquivo}
--
-- O primeiro segmento do path é o workspace — as policies abaixo
-- usam public.is_workspace_member / public.workspace_role sobre ele.
-- =============================================================

-- Bucket privado (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('anexos', 'anexos', false, 10485760)  -- 10 MB por arquivo
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

-- ─────────────────────────────────────────────────────────────
-- Policies em storage.objects
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS anexos_select ON storage.objects;
DROP POLICY IF EXISTS anexos_insert ON storage.objects;
DROP POLICY IF EXISTS anexos_delete ON storage.objects;

-- Leitura: qualquer membro do workspace dono do path
CREATE POLICY anexos_select ON storage.objects FOR SELECT
    USING (
        bucket_id = 'anexos'
        AND public.is_workspace_member(split_part(name, '/', 1)::uuid)
    );

-- Upload: admin e editor
CREATE POLICY anexos_insert ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'anexos'
        AND public.workspace_role(split_part(name, '/', 1)::uuid) IN ('admin', 'editor')
    );

-- Exclusão: admin e editor
CREATE POLICY anexos_delete ON storage.objects FOR DELETE
    USING (
        bucket_id = 'anexos'
        AND public.workspace_role(split_part(name, '/', 1)::uuid) IN ('admin', 'editor')
    );
