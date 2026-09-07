import { supabase } from './supabase';

const BUCKET = 'anexos';

export const TAMANHO_MAX_ANEXO = 10 * 1024 * 1024; // 10 MB

/** Remove caracteres problemáticos do nome do arquivo para o path. */
function sanitizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // acentos
    .replace(/[^A-Za-z0-9._-]/g, '_'); // demais caracteres
}

/**
 * Sobe o arquivo para o bucket privado 'anexos' e devolve o path.
 * Path: {workspaceId}/{processoId}/{faseId}/{timestamp}-{nomeArquivo}
 */
export async function uploadAnexo(
  workspaceId: string,
  processoId: string,
  faseId: string,
  file: File,
): Promise<string> {
  if (file.size > TAMANHO_MAX_ANEXO) {
    throw new Error('Arquivo excede o limite de 10MB.');
  }

  const path = `${workspaceId}/${processoId}/${faseId}/${Date.now()}-${sanitizarNome(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  return path;
}

/** URL assinada com validade de 1 hora — gerada sob demanda para ver/baixar. */
export async function getAnexoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao gerar link do anexo: ${error?.message ?? 'sem URL'}`);
  }
  return data.signedUrl;
}

export async function removerAnexo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Falha ao remover anexo: ${error.message}`);
}
