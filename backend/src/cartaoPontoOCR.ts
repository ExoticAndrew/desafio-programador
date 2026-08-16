import { CartaoPontoPage, Day, Punch } from "./types";

// Palavras-chave que indicam dia sem batida nesse layout (feriado, folga,
// ausencia de registro) - diferente do layout nativo do time-card-01.
const SEM_BATIDA = ["Feriado", "Descanso Semanal", "Sem Registro de Ponto"];

const RE_MES_ANO = /M[e\u00ea]s\/Ano:\s*(\d{1,2})\s*\/\s*(\d{4})/;
const RE_DIA = /^(\d{1,2})\s*([A-Z]{3})\b/;
const RE_PAR_HORARIO = /([\d:]{4,5})\s*-\s*([\d:]{4,5})/g;
const RE_FIM_TABELA = /^\(\*\)/;

// OCR as vezes perde o ":" (ex: "1815" em vez de "18:15"). Quando o
// resultado e exatamente 4 digitos, reconstroi HH:MM - e uma inferencia,
// nao uma leitura direta, documentada no SOLUCAO.md. Fora esse padrao
// (ruido sem forma reconhecivel), retorna null - honestidade em vez de chute.
function normalizarHorario(token: string): string | null {
  if (/^\d{2}:\d{2}$/.test(token)) return token;
  if (/^\d{4}$/.test(token)) return `${token.slice(0, 2)}:${token.slice(2)}`;
  return null;
}

export function tentarParsearCartaoPontoOCR(texto: string, page: number): CartaoPontoPage | null {
  const mesAno = texto.match(RE_MES_ANO);
  if (!mesAno) return null;
  const month = mesAno[1].padStart(2, "0");
  const year = mesAno[2];

  const linhas = texto.split("\n");
  const days: Day[] = [];

  for (const linhaOriginal of linhas) {
    if (RE_FIM_TABELA.test(linhaOriginal.trim())) break;

    const matchDia = linhaOriginal.match(RE_DIA);
    if (!matchDia) continue; // ruido entre dias (cabecalho, rodape) - ignora

    const numeroDia = parseInt(matchDia[1], 10);
    const dateRaw = `${String(numeroDia).padStart(2, "0")}/${month}/${year}`;
    const semBatida = SEM_BATIDA.some((kw) => linhaOriginal.includes(kw));

    const punches: Punch[] = [];
    if (!semBatida) {
      RE_PAR_HORARIO.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RE_PAR_HORARIO.exec(linhaOriginal)) !== null) {
        const entrada = normalizarHorario(m[1]);
        const saida = normalizarHorario(m[2]);
        if (entrada) punches.push({ kind: "IN", time_raw: m[1], time_hhmm: entrada });
        if (saida) punches.push({ kind: "OUT", time_raw: m[2], time_hhmm: saida });
      }
    }

    days.push({ date_raw: dateRaw, punches });
  }

  return days.length > 0 ? { page, days } : null;
}
