import ExcelJS from "exceljs";
import { CartaoPontoPage, HoleritePage, Transcricao } from "./types";
import { calcularAvisosCartaoPonto, calcularAvisosHolerite } from "./avisos";

const COR_HEADER = "FF173772";
const COR_AMARELO = "FFFFF3CD";
const COR_VERMELHO = "FFF8D7DA";
const COR_BORDA_VERMELHA = "FFDC3545";

function contemIncerteza(valores: string[]): boolean {
  return valores.some((v) => v.includes("?"));
}

interface LinhaPlanilha {
  celulas: (string | number)[];
  amarelo: boolean;
  vermelho: boolean;
}

function montarCartaoPonto(pages: CartaoPontoPage[]): { colunas: string[]; linhas: LinhaPlanilha[] } {
  let maxBatidas = 0;
  for (const p of pages) for (const d of p.days) maxBatidas = Math.max(maxBatidas, d.punches.length);
  const pares = Math.ceil(maxBatidas / 2);

  const colunas = ["Data"];
  for (let i = 1; i <= pares; i++) colunas.push(`Entrada ${i}`, `Saida ${i}`);

  const avisos = calcularAvisosCartaoPonto(pages);

  const linhas: LinhaPlanilha[] = [];
  for (const pagina of pages) {
    pagina.days.forEach((dia, dayIndex) => {
      const celulas: string[] = [dia.date_raw];
      for (let i = 0; i < pares * 2; i++) celulas.push(dia.punches[i]?.time_hhmm ?? "");

      const aviso = avisos.get(`${pagina.page}:${dayIndex}`);
      linhas.push({
        celulas,
        amarelo: !!aviso?.batidasImpares || contemIncerteza(celulas),
        vermelho: !!aviso?.dataNaoSequencial,
      });
    });
  }

  return { colunas, linhas };
}

function montarHolerite(pages: HoleritePage[]): { colunas: string[]; linhas: LinhaPlanilha[] } {
  const labels: string[] = [];
  for (const p of pages) for (const c of p.fields) if (!labels.includes(c.label)) labels.push(c.label);

  const colunas = ["Pag.", "Mes", "Ano", ...labels];
  const avisos = calcularAvisosHolerite(pages);

  const linhas: LinhaPlanilha[] = pages.map((pagina, idx) => {
    const porLabel = new Map(pagina.fields.map((c) => [c.label, c.value]));
    const valoresCampos = labels.map((l) => porLabel.get(l) ?? "");
    const celulas: (string | number)[] = [pagina.page, pagina.month, pagina.year, ...valoresCampos];

    const aviso = avisos.get(idx);
    return {
      celulas,
      amarelo: !!aviso?.paginaVazia || contemIncerteza(valoresCampos),
      vermelho: !!aviso?.mesNaoSequencial,
    };
  });

  return { colunas, linhas };
}

function montarDados(transcricao: Transcricao): { colunas: string[]; linhas: LinhaPlanilha[] } {
  if (!transcricao.value) return { colunas: [], linhas: [] };
  return transcricao.tipo === "cartao-ponto"
    ? montarCartaoPonto(transcricao.value.pages as CartaoPontoPage[])
    : montarHolerite(transcricao.value.pages as HoleritePage[]);
}

export async function gerarXlsx(transcricao: Transcricao): Promise<Buffer> {
  const { colunas, linhas } = montarDados(transcricao);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transcricao");

  const headerRow = sheet.addRow(colunas);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER } };
  });

  for (const linha of linhas) {
    const row = sheet.addRow(linha.celulas);
    if (linha.vermelho) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_VERMELHO } };
      });
      row.getCell(1).border = { left: { style: "medium", color: { argb: COR_BORDA_VERMELHA } } };
    } else if (linha.amarelo) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_AMARELO } };
      });
    }
  }

  sheet.columns.forEach((col) => {
    col.width = 14;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function escaparCsv(valor: string | number): string {
  const s = String(valor);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function gerarCsv(transcricao: Transcricao): string {
  const { colunas, linhas } = montarDados(transcricao);
  const cabecalho = colunas.map(escaparCsv).join(",");
  const corpo = linhas.map((l) => l.celulas.map(escaparCsv).join(",")).join("\n");
  return `${cabecalho}\n${corpo}`;
}
