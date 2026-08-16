import { describe, it, expect } from "vitest";
import { tentarParsearCartaoPonto } from "../cartaoPontoTexto";

const TEXTO = `Mes/Ano\t:\t7 / 2012
Dia\tSemana\tJornada\tEntrada\tSaida\tOcorrencia\tQtde
1 - DOM\t08:00
2 - SEG\t08:00\t09:03\t14:05\tHE-BCO DE HORAS\t00:13
15:12\t18:36\tHE-REMUNERADA\t00:13
Assinado eletronicamente por:\t- 12/03/2018 08:34:23 - 6b8cdfa`;

describe("cartaoPontoTexto", () => {
  it("nao perde dias sem batida (fim de semana vira punches vazio, nao some)", () => {
    const resultado = tentarParsearCartaoPonto(TEXTO, 1);
    expect(resultado).not.toBeNull();
    expect(resultado!.days[0].date_raw).toBe("01/07/2012");
    expect(resultado!.days[0].punches).toEqual([]);
  });

  it("nao confunde a coluna Qtde (tambem HH:MM) com uma batida real", () => {
    const resultado = tentarParsearCartaoPonto(TEXTO, 1);
    const dia2 = resultado!.days[1];
    expect(dia2.punches).toHaveLength(4);
    expect(dia2.punches.map((p) => p.time_hhmm)).toEqual(["09:03", "14:05", "15:12", "18:36"]);
  });

  it("retorna null quando nao encontra Mes/Ano no texto", () => {
    const resultado = tentarParsearCartaoPonto("texto sem cabecalho reconhecivel", 1);
    expect(resultado).toBeNull();
  });
});
