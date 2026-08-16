import { CartaoPontoPage, HoleritePage } from "./types";

export interface AvisoDia {
  batidasImpares: boolean;
  dataNaoSequencial: boolean;
}

function parseDataBR(dateRaw: string): Date | null {
  const m = dateRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null; // data com "?" ou formato inesperado - nao entra na comparacao
  const [, dd, mm, yyyy] = m;
  const data = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  // Confere que os componentes batem (pega data impossivel tipo 31/02, que o
  // Date do JS "corrige" silenciosamente virando marco em vez de rejeitar).
  if (data.getFullYear() !== Number(yyyy) || data.getMonth() !== Number(mm) - 1 || data.getDate() !== Number(dd)) {
    return null;
  }
  return data;
}

// Batidas impares: numero de punches do dia nao e par (falta uma entrada
// ou saida). Data nao sequencial: a data do dia nao e exatamente +1 dia
// corrido em relacao ao dia anterior no documento (compara so entre datas
// legiveis - "?" ou data impossivel nao quebra nem participa da cadeia).
export function calcularAvisosCartaoPonto(pages: CartaoPontoPage[]): Map<string, AvisoDia> {
  const avisos = new Map<string, AvisoDia>();
  let dataAnterior: Date | null = null;

  for (const pagina of pages) {
    pagina.days.forEach((dia, idx) => {
      const chave = `${pagina.page}:${idx}`;
      const batidasImpares = dia.punches.length % 2 !== 0;

      const dataAtual = parseDataBR(dia.date_raw);
      let dataNaoSequencial = false;
      if (dataAtual && dataAnterior) {
        const diffDias = Math.round((dataAtual.getTime() - dataAnterior.getTime()) / 86400000);
        dataNaoSequencial = diffDias !== 1;
      }
      if (dataAtual) dataAnterior = dataAtual;

      avisos.set(chave, { batidasImpares, dataNaoSequencial });
    });
  }

  return avisos;
}

export interface AvisoCompetencia {
  paginaVazia: boolean;
  mesNaoSequencial: boolean;
}

// Pagina vazia: nenhum campo nem base saiu dela (layout desconhecido ou
// OCR nao implementado pra esse tipo ainda). Mes nao sequencial: a
// competencia nao e exatamente o mes seguinte a anterior LEGIVEL - dez/jan
// conta como consecutivo (ano*12+mes vira contador linear); competencias
// ilegiveis (year/month vazios) nao quebram a cadeia nem entram nela.
export function calcularAvisosHolerite(pages: HoleritePage[]): Map<number, AvisoCompetencia> {
  const avisos = new Map<number, AvisoCompetencia>();
  let competenciaAnterior: { totalMeses: number } | null = null;

  pages.forEach((pg, idx) => {
    const paginaVazia = pg.fields.length === 0 && pg.bases.length === 0;
    const legivel = pg.year !== "" && pg.month !== "";

    let mesNaoSequencial = false;
    if (legivel) {
      const totalMeses = Number(pg.year) * 12 + Number(pg.month);
      if (competenciaAnterior) {
        mesNaoSequencial = totalMeses - competenciaAnterior.totalMeses !== 1;
      }
      competenciaAnterior = { totalMeses };
    }

    avisos.set(idx, { paginaVazia, mesNaoSequencial });
  });

  return avisos;
}
