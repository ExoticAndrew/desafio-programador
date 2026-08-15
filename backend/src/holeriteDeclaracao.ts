import { HoleritePage, HoleriteField, HoleriteBase } from "./types";

// Layout "declaracao": cabecalho "Verba Nome Base/Saldo/Beneficio Valor",
// pode ter 2 sub-blocos por competencia ("MES" e "ACERTO"), cada um com
// seu proprio "Mes/Ano:" e sua propria zona de bases logo apos a tabela.

const RE_ASSINATURA = /Declara[cç][aã]o Remunera[cç][aã]o/i;
const RE_MESANO_BLOCO = /M[eê]s\/Ano:\t(\d{2})\/(\d{4})/g;
const RE_HEADER = /^Verba\b/i;
const RE_CODIGO_LINHA = /^\d+\s+\S/;
const RE_NUMERO = /^-?[\d.]+,\d{2}$/;

function extrairCamposDoBloco(linhas: string[], idxHeader: number): { fields: HoleriteField[]; idxFim: number } {
  const fields: HoleriteField[] = [];
  let i = idxHeader + 1;

  for (; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!RE_CODIGO_LINHA.test(linha)) break; // primeira linha que nao e verba = fim da tabela

    const segmentos = linha.split("\t").map((s) => s.trim()).filter((s) => s.length > 0);
    if (segmentos.length < 2 || !/^\d+$/.test(segmentos[0])) continue;

    const code = segmentos[0];
    const label = segmentos[1];
    const resto = segmentos.slice(2);
    if (resto.length === 0) continue;

    const value = resto[resto.length - 1];
    const reference = resto.length >= 2 ? resto.slice(0, -1).join(" ") : "";

    fields.push({ code, label, reference, value });
  }

  return { fields, idxFim: i };
}

// Bases desse layout nao seguem uma lista fixa de rotulos (variam: "Proventos
// Bruto", "Consignacao", "Margem (30%)" etc) - extrai qualquer "Rotulo: valor"
// da zona de bases, ao inves de uma lista fechada como nos outros layouts.
const RE_BASE_GENERICA = /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9()%.\/ ]*?)\s*:\s*([\-\d.,]+)/g;

function extrairBasesDoBloco(linhas: string[], idxInicio: number, idxFim: number): HoleriteBase[] {
  const bases: HoleriteBase[] = [];
  const texto = linhas.slice(idxInicio, idxFim).join("\t");

  RE_BASE_GENERICA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_BASE_GENERICA.exec(texto)) !== null) {
    const rotulo = m[1].trim();
    if (!RE_NUMERO.test(m[2])) continue;
    bases.push({ label: rotulo, value: m[2] });
  }

  return bases;
}

export function tentarLayoutDeclaracao(textoOriginal: string, page: number): HoleritePage[] | null {
  if (!RE_ASSINATURA.test(textoOriginal)) return null;

  const linhas = textoOriginal.replace(/[ \t]{2,}/g, "\t").split("\n");

  const marcadoresMes: { linha: number; month: string; year: string }[] = [];
  linhas.forEach((linha, idx) => {
    const m = linha.match(/M[eê]s\/Ano:\t?(\d{2})\/(\d{4})/);
    if (m) marcadoresMes.push({ linha: idx, month: m[1], year: m[2] });
  });
  if (marcadoresMes.length === 0) return null;

  const paginas: HoleritePage[] = [];
  for (let i = 0; i < marcadoresMes.length; i++) {
    const inicioBloco = marcadoresMes[i].linha;
    const fimBloco = i + 1 < marcadoresMes.length ? marcadoresMes[i + 1].linha : linhas.length;

    const idxHeaderRelativo = linhas.slice(inicioBloco, fimBloco).findIndex((l) => RE_HEADER.test(l));
    if (idxHeaderRelativo === -1) continue;
    const idxHeader = inicioBloco + idxHeaderRelativo;

    const { fields, idxFim } = extrairCamposDoBloco(linhas, idxHeader);
    const bases = extrairBasesDoBloco(linhas, idxFim, fimBloco);

    paginas.push({
      page,
      year: marcadoresMes[i].year,
      month: marcadoresMes[i].month,
      fields,
      bases,
    });
  }

  return paginas.length > 0 ? paginas : null;
}
