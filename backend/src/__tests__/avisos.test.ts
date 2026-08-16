import { describe, it, expect } from "vitest";
import { calcularAvisosHolerite, calcularAvisosCartaoPonto } from "../avisos";
import { HoleritePage, CartaoPontoPage } from "../types";

describe("avisos - holerite", () => {
  it("dezembro seguido de janeiro NAO conta como mes nao sequencial", () => {
    const pages: HoleritePage[] = [
      { page: 1, year: "2023", month: "12", fields: [{ code: "1", label: "x", reference: "", value: "1" }], bases: [] },
      { page: 2, year: "2024", month: "01", fields: [{ code: "1", label: "x", reference: "", value: "1" }], bases: [] },
    ];
    const avisos = calcularAvisosHolerite(pages);
    expect(avisos.get(1)!.mesNaoSequencial).toBe(false);
  });

  it("competencia ilegivel nao quebra a cadeia - compara com a ultima legivel", () => {
    const pages: HoleritePage[] = [
      { page: 1, year: "2024", month: "01", fields: [{ code: "1", label: "x", reference: "", value: "1" }], bases: [] },
      { page: 2, year: "", month: "", fields: [], bases: [] },
      { page: 3, year: "2024", month: "02", fields: [{ code: "1", label: "x", reference: "", value: "1" }], bases: [] },
    ];
    const avisos = calcularAvisosHolerite(pages);
    expect(avisos.get(2)!.mesNaoSequencial).toBe(false);
  });
});

describe("avisos - cartao de ponto", () => {
  it("numero impar de batidas gera aviso", () => {
    const pages: CartaoPontoPage[] = [
      { page: 1, days: [{ date_raw: "01/05/2024", punches: [{ kind: "IN", time_raw: "08:00", time_hhmm: "08:00" }] }] },
    ];
    const avisos = calcularAvisosCartaoPonto(pages);
    expect(avisos.get("1:0")!.batidasImpares).toBe(true);
  });
});
