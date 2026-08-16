import { CartaoPontoPage, Day, Punch } from "./types";

// Ocorrencias conhecidas que vem seguidas de uma duracao HH:MM (Qtde) -
// essa duracao NAO e uma batida e precisa ser removida antes de extrair
// os horarios reais da linha, senao vira uma "batida fantasma".
const OCORRENCIAS = [
  "HE-BCO DE HORAS",
  "HE-REMUNERADA",
  "HE COMPENSADA",
  "ABN/DEC.CHEFIA",
  "REG. SUSPENSO",
];

const RE_HORARIO = /\d{2}:\d{2}/g;
const RE_DIA_SEMANA = /^(\d{1,2})\s*-\s*([A-Z]{3})\b/;
const RE_MES_ANO = /M[e\u00ea]s\/Ano[\s:]+(\d{1,2})\s*\/\s*(\d{4})/;
const RE_HEADER_TABELA = /^Dia\b/;

function removerOcorrenciaEQtde(linha: string): string {
  let resultado = linha;
  for (const ocorrencia of OCORRENCIAS) {
    const padrao = ocorrencia.replace(/[.]/g, "\\.").replace(/ /g, "\\s+");
    const regex = new RegExp(`${padrao}\\s*\\d{2}:\\d{2}`, "g");
    resultado = resultado.replace(regex, "");
  }
  return resultado;
}

export function tentarParsearCartaoPonto(texto: string, page: number): CartaoPontoPage | null {
  const mesAno = texto.match(RE_MES_ANO);
  if (!mesAno) return null;
  const mesNum = parseInt(mesAno[1], 10);
  const month = mesNum >= 1 && mesNum <= 12 ? mesAno[1].padStart(2, "0") : "??";
  const year = mesAno[2];

  const linhas = texto.split("\n");
  const idxHeader = linhas.findIndex((l) => RE_HEADER_TABELA.test(l.trim()) && l.includes("Semana"));
  if (idxHeader === -1) return null;

  const days: Day[] = [];
  let diaAtualNumero: number | null = null;
  let diaAtualDateRaw: string | null = null;
  let punchesAtuais: Punch[] = [];

  const finalizarDia = () => {
    if (diaAtualDateRaw !== null) {
      days.push({ date_raw: diaAtualDateRaw, punches: punchesAtuais });
    }
    punchesAtuais = [];
  };

  for (const linhaOriginal of linhas.slice(idxHeader + 1)) {
    if (/Assinado eletronicamente/.test(linhaOriginal)) break;

    const linhaLimpa = removerOcorrenciaEQtde(linhaOriginal);
    const matchDia = linhaLimpa.match(RE_DIA_SEMANA);
    let horarios = Array.from(linhaLimpa.matchAll(RE_HORARIO)).map((m) => m[0]);

    if (matchDia) {
      const numeroDia = parseInt(matchDia[1], 10);
      horarios = horarios.slice(1); // primeiro horario da linha de dia = Jornada, nao e batida

      if (numeroDia !== diaAtualNumero) {
        finalizarDia();
        diaAtualNumero = numeroDia;
        // O documento nao imprime a data completa por linha, so o dia do
        // mes - reconstruimos DD/MM/AAAA a partir do cabecalho Mes/Ano da
        // pagina. Decisao documentada no SOLUCAO.md.
        const diaStr = numeroDia >= 1 && numeroDia <= 31 ? String(numeroDia).padStart(2, "0") : "??";
        diaAtualDateRaw = `${diaStr}/${month}/${year}`;
      }
    }

    for (const h of horarios) {
      const kind: "IN" | "OUT" = punchesAtuais.length % 2 === 0 ? "IN" : "OUT";
      punchesAtuais.push({ kind, time_raw: h, time_hhmm: h });
    }
  }
  finalizarDia();

  return { page, days };
}



