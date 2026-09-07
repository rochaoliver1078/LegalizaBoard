/**
 * Setup do Vitest — roda antes de cada arquivo de teste.
 *
 * Vários utilitários de `src/utils/helpers.ts` leem `localStorage` para
 * checar overrides locais de configuração (ex.: modelos de fase
 * customizados). Em ambiente Node (sem jsdom) essa API não existe por
 * padrão, então fornecemos aqui um shim simples em memória.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}
