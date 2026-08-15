import { salvar, buscar } from "./store";
import { TipoDocumento, TranscricaoValue, HoleritePage, CartaoPontoPage } from "./types";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarParsearHolerite } from "./holeriteRouter";
import { tentarParsearCartaoPonto } from "./cartaoPontoTexto";
import { tentarParsearCartaoPontoOCR } from "./cartaoPontoOCR";
import { renderizarPaginaComoImagem, ocrImagem } from "./ocr";

async function processarHolerite(buffer: Buffer): Promise<TranscricaoValue> {
  const paginasTexto = await extrairTextoPorPagina(buffer);
  const pages: HoleritePage[] = [];

  for (const p of paginasTexto) {
    const reconhecido = tentarParsearHolerite(p.texto, p.page);
    if (reconhecido) {
      pages.push(...reconhecido);
    } else {
      // TODO: fallback de OCR pra holerite ainda nao implementado
      // (so cartao de ponto usa OCR nesta entrega - ver SOLUCAO.md).
      pages.push({ page: p.page, year: "", month: "", fields: [], bases: [] });
    }
  }

  return { pages };
}

async function processarCartaoPonto(buffer: Buffer): Promise<TranscricaoValue> {
  const paginasTexto = await extrairTextoPorPagina(buffer);
  const pages: CartaoPontoPage[] = [];

  for (const p of paginasTexto) {
    if (p.temCamadaTexto) {
      const reconhecido = tentarParsearCartaoPonto(p.texto, p.page);
      pages.push(reconhecido ?? { page: p.page, days: [] });
      continue;
    }

    // Sem camada de texto (documento escaneado) - passa por OCR.
    try {
      const imagem = await renderizarPaginaComoImagem(buffer, p.page);
      const textoOcr = await ocrImagem(imagem);
      const reconhecido = tentarParsearCartaoPontoOCR(textoOcr, p.page);
      pages.push(reconhecido ?? { page: p.page, days: [] });
    } catch {
      // OCR falhou (imagem corrompida, etc) - pagina fica honestamente vazia.
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
