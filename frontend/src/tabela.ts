import type { CartaoPontoPage, HoleritePage } from "./types";

export interface TabelaCartaoPonto {
  colunas: string[];
  linhas: { page: number; dayIndex: number; date_raw: string; celulas: string[] }[];
}

export function transformarCartaoPonto(pages: CartaoPontoPage[]): TabelaCartaoPonto {
  let maxBatidas = 0;
  for (const pagina of pages) {
    for (const dia of pagina.days) {
      maxBatidas = Math.max(maxBatidas, dia.punches.length);
    }
  }
  const pares = Math.ceil(maxBatidas / 2);

  const colunas = ["Data"];
  for (let i = 1; i <= pares; i++) {
    colunas.push(`Entrada ${i}`, `Saida ${i}`);
  }

  const linhas = pages.flatMap((pagina) =>
    pagina.days.map((dia, dayIndex) => {
      const celulas: string[] = [];
      for (let i = 0; i < pares * 2; i++) {
        celulas.push(dia.punches[i]?.time_hhmm ?? "");
      }
      return { page: pagina.page, dayIndex, date_raw: dia.date_raw, celulas };
    })
  );

  return { colunas, linhas };
}

export interface TabelaHolerite {
  colunas: string[];
  linhas: { pageIndex: number; page: number; mes: string; ano: string; celulas: string[] }[];
}

export function transformarHolerite(pages: HoleritePage[]): TabelaHolerite {
  const labelsVistos: string[] = [];
  for (const pagina of pages) {
    for (const campo of pagina.fields) {
      if (!labelsVistos.includes(campo.label)) labelsVistos.push(campo.label);
    }
  }

  const colunas = ["Pag.", "Mes", "Ano", ...labelsVistos];

  const linhas = pages.map((pagina, pageIndex) => {
    const porLabel = new Map(pagina.fields.map((c) => [c.label, c.value]));
    const celulas = labelsVistos.map((label) => porLabel.get(label) ?? "");
    return { pageIndex, page: pagina.page, mes: pagina.month, ano: pagina.year, celulas };
  });

  return { colunas, linhas };
}
