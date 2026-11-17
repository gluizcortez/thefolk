import { ptBR } from './pt-BR';

const locales: Record<string, Record<string, string>> = { 'pt-BR': ptBR };
let current = ptBR;

export function setLocale(id: string): void {
  current = locales[id] ?? ptBR;
}

/** Texto traduzido; `{chave}` é trocado pelos parâmetros. */
export function t(key: string, params?: Record<string, string | number>): string {
  const text = current[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export function hasText(key: string): boolean {
  return key in current;
}
