import type { CartaoPontoPage, HoleritePage, Punch } from "./types";

export function atualizarCelulaCartaoPonto(
  pages: CartaoPontoPage[],
  page: number,
  dayIndex: number,
  colIndex: number,
  novoValor: string
): CartaoPontoPage[] {
  return pages.map((pagina) => {
    if (pagina.page !== page) return pagina;
    return {
      ...pagina,
      days: pagina.days.map((dia, idx) => {
        if (idx !== dayIndex) return dia;

        if (colIndex === 0) {
          return { ...dia, date_raw: novoValor };
        }

        const punchIndex = colIndex - 1;
        const punches = [...dia.punches];
        const kind: "IN" | "OUT" = punchIndex % 2 === 0 ? "IN" : "OUT";

        if (punchIndex < punches.length) {
          punches[punchIndex] = { ...punches[punchIndex], time_raw: novoValor, time_hhmm: novoValor };
        } else {
          while (punches.length < punchIndex) {
            const kIntermediario: "IN" | "OUT" = punches.length % 2 === 0 ? "IN" : "OUT";
            punches.push({ kind: kIntermediario, time_raw: "", time_hhmm: "" });
          }
          const novoPunch: Punch = { kind, time_raw: novoValor, time_hhmm: novoValor };
          punches.push(novoPunch);
        }

        return { ...dia, punches };
      }),
    };
  });
}

export function atualizarCelulaHolerite(
  pages: HoleritePage[],
  pageIndex: number,
  label: string,
  novoValor: string
): HoleritePage[] {
  return pages.map((pagina, idx) => {
    if (idx !== pageIndex) return pagina;

    const existe = pagina.fields.some((f) => f.label === label);
    const fields = existe
      ? pagina.fields.map((f) => (f.label === label ? { ...f, value: novoValor } : f))
      : [...pagina.fields, { code: "", label, reference: "", value: novoValor }];

    return { ...pagina, fields };
  });
}
