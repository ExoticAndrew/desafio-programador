import type { TipoDocumento, Transcricao } from "./types";

// URL configuravel via variavel de ambiente (Vite) - default assume
// backend rodando local na 3000, ajustavel no .env em producao/Docker.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function enviarTranscricao(arquivo: File, tipo: TipoDocumento): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  formData.append("tipo", tipo);

  const resposta = await fetch(`${API_URL}/api/transcricoes`, {
    method: "POST",
    body: formData,
  });

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.erro || `Falha no upload (status ${resposta.status})`);
  }

  return resposta.json();
}

export async function buscarTranscricao(id: string): Promise<Transcricao> {
  const resposta = await fetch(`${API_URL}/api/transcricoes/${id}`);
  if (!resposta.ok) {
    throw new Error(`Falha ao consultar transcricao (status ${resposta.status})`);
  }
  return resposta.json();
}

export async function salvarTranscricao(id: string, value: Transcricao["value"]): Promise<Transcricao> {
  const resposta = await fetch(`${API_URL}/api/transcricoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao salvar correcoes (status ${resposta.status})`);
  }
  return resposta.json();
}

