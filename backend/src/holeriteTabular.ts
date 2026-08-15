import { HoleritePage, HoleriteField, HoleriteBase } from "./types";

// Layout "tabular": cabecalho "Cod. Descricao | Unidade | Proventos | Descontos",
// bloco de bases logo apos "Total", com rotulos fixos (Base I.N.S.S., F.G.T.S. do Mes, etc).

const RE_ASSINATURA = /Cod\.\s*Descri[cç][aã]o/i;
const RE_PERIODO = /Per[ií]odo\s*:\s*(\d{2})\/(\d{4})/i;
const RE_HEADER = /Cod\.\s*Descri[cç][aã]o/i;
const RE_TOTAL = /^Total\b/i;
const RE_NUMERO = /^-?[\d.]+,\d{2}$/; // formato BR: 1.678,61

function ehNumeroBR(token: string): boolean {
  return RE_NUMERO.test(token.trim());
}

// Uma linha de verba: "CODIGO Descricao<TAB>unidade?<TAB>valor"
// Ex: "0105 Dias Trabalhados\t30,00\t1.678,61" ou "2100 DSR sobre Variaveis\t26,77"
function parseLinhaCampo(linha: string): HoleriteField | null {
  const partes = linha.split("\t").map((p) => p.trim()).filter((p) => p.length > 0);
  if (partes.length === 0) return null;

  const primeiraParte = partes[0];
  const match = primeiraParte.match(/^(\S+)\s+(.+)$/);
  if (!match) return null;

  const [, code, label] = match;
  const numeros = partes.slice(1).filter(ehNumeroBR);
  if (numeros.length === 0) return null;

  const reference = numeros.length >= 2 ? numeros[0] : "";
  const value = numeros[numeros.length - 1];

  return { code, label, reference, value };
}

// Rotulos de base conhecidos, buscados por regex no texto da pagina inteira
// (mais robusto que depender de tabs exatos, que variam de posicao entre paginas).
const PADROES_BASES: { rotulo: string; regex: RegExp }[] = [
  { rotulo: "Base INSS", regex: /Base\s+I\.?N\.?S\.?S\.?\s*:\s*([\d.,]+)/i },
  { rotulo: "Base IR", regex: /Base\s+I\.?R\.?R\.?F\.?\s*:\s*([\d.,]+)/i },
  { rotulo: "FGTS", regex: /F\.?G\.?T\.?S\.?\s*do\s*M[eê]s\s*:\s*([\d.,]+)/i },
  { rotulo: "Total Vencimentos", regex: /^Total[\t ]+([\d.,]+)/im },
  { rotulo: "Total Descontos", regex: /^Total[\t ]+[\d.,]+[\t ]+([\d.,]+)/im },
  { rotulo: "Valor Líquido", regex: /L[ií]q[uü]ido\s*\t?([\d.,]+)/i },
];

function extrairBases(texto: string): HoleriteBase[] {
  const bases: HoleriteBase[] = [];
  for (const { rotulo, regex } of PADROES_BASES) {
    const m = texto.match(regex);
    if (m) bases.push({ label: rotulo, value: m[1] });
  }
  return bases;
}

export function tentarLayoutTabular(texto: string, page: number): HoleritePage | null {
  if (!RE_ASSINATURA.test(texto)) return null;

  const periodoMatch = texto.match(RE_PERIODO);
  if (!periodoMatch) return null;
  const [, month, year] = periodoMatch;

  const linhas = texto.split("\n");
  const idxHeader = linhas.findIndex((l) => RE_HEADER.test(l));
  const idxTotal = linhas.findIndex((l, i) => i > idxHeader && RE_TOTAL.test(l.trim()));
  if (idxHeader === -1 || idxTotal === -1) return null;

  const fields: HoleriteField[] = [];
  for (let i = idxHeader + 1; i < idxTotal; i++) {
    const campo = parseLinhaCampo(linhas[i]);
    if (campo) fields.push(campo);
  }

  const bases = extrairBases(texto);

  return { page, year, month, fields, bases };
}
