import { HoleritePage, HoleriteField, HoleriteBase } from "./types";

// Layout "ficha financeira": uma pagina contem N blocos de competencia
// ("Folha Normal", "Adiantamento - PLR", "13 Salario"), cada um iniciado
// por uma linha "Mes:\t<abr>-<aa>". Os 3 blocos visuais (Rendimentos,
// Descontos, Bases/Resultados) ficam lado a lado na mesma linha do PDF.

const MESES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

const RE_ASSINATURA = /BASEDECALCULODOINSS/;
const RE_MES_BLOCO = /M[eê]s:\t([a-z]{3})-(\d{2})/gi;

// Rotulos de base "colados" (sem espaco), seguidos de tab + valor.
const ROTULOS_BASE: { chave: string; rotulo: string }[] = [
  { chave: "BASEDECALCULODOINSS", rotulo: "Base INSS" },
  { chave: "BASEDECALCULODOIRF", rotulo: "Base IR" },
  { chave: "BASEDECALCULODOFGTS", rotulo: "Base FGTS" },
  { chave: "VALORDOFGTS", rotulo: "FGTS" },
  { chave: "SALARIOLIQUIDONOMES", rotulo: "Valor Líquido" },
  { chave: "VALORDOIRFARECOLHER", rotulo: "Valor IRF a Recolher" },
  { chave: "TOTALDESCONTOS", rotulo: "Total Descontos" },
  { chave: "TOT\\.RENDIMENTOS", rotulo: "Total Vencimentos" },
];

// Campos sem codigo numerico, mas que sao verba de fato (nao base/total).
const CAMPOS_SEM_CODIGO = ["REMUNERAÇÃOMES", "DIAS/HORASTRAB"];

function normalizarEspacos(texto: string): string {
  // Colapsa runs de espaco/tab (>=2 chars) num unico tab - protege contra
  // variacao de espacamento entre paginas/copias sem perder a separacao de coluna.
  return texto.replace(/[ \t]{2,}/g, "\t");
}

function extrairBasesDoBloco(bloco: string): HoleriteBase[] {
  const bases: HoleriteBase[] = [];
  for (const { chave, rotulo } of ROTULOS_BASE) {
    const regex = new RegExp(`${chave}\\t([\\d.,]+)`);
    const m = bloco.match(regex);
    if (m) bases.push({ label: rotulo, value: m[1] });
  }
  return bases;
}

const RE_NUMERO = /^-?[\d.]+,\d{2}$|^\d+$/; // "1.260,65" ou "0" (ref as vezes vem sem decimal)
const ROTULOS_BASE_SET = new Set(ROTULOS_BASE.map((r) => r.chave.replace("\\.", ".")));

function ehNumeroBR(token: string): boolean {
  return RE_NUMERO.test(token.trim());
}

function extrairCamposDoBloco(bloco: string): HoleriteField[] {
  const fields: HoleriteField[] = [];

  for (const linha of bloco.split("\n")) {
    const segmentos = linha.split("\t").map((s) => s.trim()).filter((s) => s.length > 0);

    let atual: { code: string; label: string; numeros: string[] } | null = null;
    let ignorarProximoNumero = false;

    const finalizar = () => {
      if (atual && atual.numeros.length > 0) {
        const reference = atual.numeros.length >= 2 ? atual.numeros[0] : "";
        const value = atual.numeros[atual.numeros.length - 1];
        fields.push({ code: atual.code, label: atual.label, reference, value });
      }
      atual = null;
    };

    for (const seg of segmentos) {
      if (ROTULOS_BASE_SET.has(seg)) {
        finalizar();
        ignorarProximoNumero = true;
        continue;
      }
      if (ehNumeroBR(seg)) {
        if (ignorarProximoNumero) {
          ignorarProximoNumero = false;
          continue;
        }
        if (atual) atual.numeros.push(seg);
        continue;
      }
      finalizar();
      ignorarProximoNumero = false;
      if (CAMPOS_SEM_CODIGO.includes(seg)) {
        atual = { code: "", label: seg, numeros: [] };
        continue;
      }
      const m = seg.match(/^(\d{1,4})\s+(.+)$/);
      atual = m ? { code: m[1], label: m[2], numeros: [] } : null;
    }
    finalizar();
  }

  return fields;
}

export function tentarLayoutFichaFinanceira(textoOriginal: string, page: number): HoleritePage[] | null {
  if (!RE_ASSINATURA.test(textoOriginal)) return null;

  const texto = normalizarEspacos(textoOriginal);

  const marcadores: { index: number; month: string; year: string }[] = [];
  RE_MES_BLOCO.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_MES_BLOCO.exec(texto)) !== null) {
    const [, mesAbrev, anoAbrev] = m;
    const month = MESES[mesAbrev.toLowerCase()];
    if (!month) continue;
    marcadores.push({ index: m.index, month, year: `20${anoAbrev}` });
  }
  if (marcadores.length === 0) return null;

  const paginas: HoleritePage[] = [];
  for (let i = 0; i < marcadores.length; i++) {
    const inicio = marcadores[i].index;
    const fim = i + 1 < marcadores.length ? marcadores[i + 1].index : texto.length;
    const bloco = texto.slice(inicio, fim);

    paginas.push({
      page,
      year: marcadores[i].year,
      month: marcadores[i].month,
      fields: extrairCamposDoBloco(bloco),
      bases: extrairBasesDoBloco(bloco),
    });
  }

  return paginas;
}
