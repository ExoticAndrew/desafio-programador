import { Transcricao } from "./types";

// Map em memoria: simples, suficiente pro escopo (1 recurso, sem relacao).
const transcricoes = new Map<string, Transcricao>();

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
