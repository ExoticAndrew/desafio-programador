import { describe, it, expect } from "vitest";
import { tentarParsearCartaoPontoOCR } from "../cartaoPontoOCR";

const TEXTO = `Mês/Ano: 05/2010
01 SAB Feriado 610 100 N
17SEG —12:00-1815 — 15:00-15:15 610 276 Ss
(*) Horas não trabalhadas`;

describe("cartaoPontoOCR", () => {
  it("reconstroi HH:MM quando o OCR perde o dois-pontos (1815 -> 18:15)", () => {
    const resultado = tentarParsearCartaoPontoOCR(TEXTO, 1);
    expect(resultado).not.toBeNull();
    const dia17 = resultado!.days.find((d) => d.date_raw === "17/05/2010");
    expect(dia17!.punches.map((p) => p.time_hhmm)).toContain("18:15");
  });

  it("dia com ocorrencia sem horario (feriado) fica com punches vazio", () => {
    const resultado = tentarParsearCartaoPontoOCR(TEXTO, 1);
    const dia1 = resultado!.days.find((d) => d.date_raw === "01/05/2010");
    expect(dia1!.punches).toEqual([]);
  });
});
