/**
 * Proteção contra eco do Realtime: quando este cliente grava uma linha,
 * o Supabase devolve o mesmo evento via canal. Registramos o updated_at
 * de cada save próprio por 5 segundos e ignoramos eventos coincidentes,
 * evitando re-render duplo.
 */
const savesProprios = new Set<string>();

const TTL_MS = 5_000;

export function registrarSaveProprio(updatedAt: string): void {
  savesProprios.add(updatedAt);
  setTimeout(() => savesProprios.delete(updatedAt), TTL_MS);
}

export function ehEcoProprio(updatedAt: string | null | undefined): boolean {
  return !!updatedAt && savesProprios.has(updatedAt);
}
