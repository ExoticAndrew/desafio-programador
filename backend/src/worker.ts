import { salvar, buscar } from "./store";
import { TipoDocumento, TranscricaoValue, HoleritePage, CartaoPontoPage } from "./types";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarParsearHolerite } from "./holeriteRouter";
import { tentarParsearCartaoPonto } from "./cartaoPontoTexto";

async function processarHolerite(buffer: Buffer): Promise<TranscricaoValue> {
  const paginasTexto = await extrairTextoPorPagina(buffer);
  const pages: HoleritePage[] = [];

  for (const p of paginasTexto) {
    const reconhecido = tentarParsearHolerite(p.texto, p.page);
    if (reconhecido) {
      pages.push(...reconhecido);
    } else {
      pages.push({ page: p.page, year: "", month: "", fields: [], bases: [] });
    }
  }

  return { pages };
}

async function processarCartaoPonto(buffer: Buffer): Promise<TranscricaoValue> {
  const paginasTexto = await extrairTextoPorPagina(buffer);
  const pages: CartaoPontoPage[] = [];

  for (const p of paginasTexto) {
    const reconhecido = tentarParsearCartaoPonto(p.texto, p.page);
    if (reconhecido) {
      pages.push(reconhecido);
    } else {
      // Sem camada de texto reconhecivel (documento escaneado) - OCR ainda
      // nao implementado pra cartao de ponto. Pagina fica honestamente
      // vazia em vez de sumir ou inventar dado.
      pages.push({ page: p.page, days: [] });
    }
  }

  return { pages };
}

export function iniciarProcessamento(id: string, buffer: Buffer, tipo: TipoDocumento): void {
  (async () => {
    try {
      const value: TranscricaoValue =
        tipo === "holerite" ? await processarHolerite(buffer) : await processarCartaoPonto(buffer);

      const atual = buscar(id);
      if (!atual) return;
      salvar({ ...atual, status: "concluido", value });
    } catch (err) {
      const atual = buscar(id);
      if (!atual) return;
      const mensagem = err instanceof Error ? err.message : "erro desconhecido ao processar";
      salvar({ ...atual, status: "erro", erro: mensagem });
    }
  })();
}
