import { describe, it, expect } from "vitest";
import { tentarParsearCartaoPontoOCR } from "../cartaoPontoOCR";

describe("nunca produz data impossivel", () => {
  it("dia fora de 1-31 vira ?? em vez de aceitar o numero", () => {
    const texto = `Mês/Ano: 05/2010
38SEG 09:00-18:00 12:00-13:00`;
    const resultado = tentarParsearCartaoPontoOCR(texto, 1);
    expect(resultado!.days[0].date_raw).toBe("??/05/2010");
  });

  it("mes fora de 1-12 vira ?? em vez de aceitar o numero", () => {
    const texto = `Mês/Ano: 13/2010
01SEG 09:00-18:00 12:00-13:00`;
    const resultado = tentarParsearCartaoPontoOCR(texto, 1);
    expect(resultado!.days[0].date_raw).toBe("01/??/2010");
  });
});
