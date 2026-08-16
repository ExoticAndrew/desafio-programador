import { Transcricao } from "./types";

const transcricoes = new Map<string, Transcricao>();
const buffersPdf = new Map<string, Buffer>();

export function salvar(t: Transcricao): void {
  transcricoes.set(t.id, t);
}

export function buscar(id: string): Transcricao | undefined {
  return transcricoes.get(id);
}

export function atualizarValue(id: string, value: Transcricao["value"]): Transcricao | undefined {
  const atual = transcricoes.get(id);
  if (!atual) return undefined;
  const atualizado = { ...atual, value };
  transcricoes.set(id, atualizado);
  return atualizado;
}

export function salvarPdfBuffer(id: string, buffer: Buffer): void {
  buffersPdf.set(id, buffer);
}

export function buscarPdfBuffer(id: string): Buffer | undefined {
  return buffersPdf.get(id);
}
