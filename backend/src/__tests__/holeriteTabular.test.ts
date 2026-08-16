import { describe, it, expect } from "vitest";
import { tentarLayoutTabular } from "../holeriteTabular";

const TEXTO_PAGINA_1 = `Fls.: 230
D E M O N S T R A T I V O\tD E\tP A G A M E N T O\tM E N S A L
Período : 10/2019\tData Pagto: 31.10.2019\t06.12.2024 11:11:52\tPág: 1
Cod. Descrição\tUnidade\tProventos\tDescontos
0105 Dias Trabalhados\t30,00\t1.678,61
/314 Contr. INSS Remuneração\t9,00\t177,03
Total\t1.967,07\t859,46
Líqüido\t1.107,61
Base I.N.S.S. :\t1.967,07\tF.G.T.S. do Mês\t:\t157,37
Base I.R.R.F. :\t1.790,04\tBase I.R.R.F. 13o.:
Assinado eletronicamente por:\t- Juntado em: 09/12/2024 12:23:44 - 8036187`;

describe("holeriteTabular", () => {
  it("separa fields de bases corretamente", () => {
    const resultado = tentarLayoutTabular(TEXTO_PAGINA_1, 1);
    expect(resultado).not.toBeNull();
    expect(resultado!.fields).toHaveLength(2);
    expect(resultado!.fields[0]).toEqual({
      code: "0105",
      label: "Dias Trabalhados",
      reference: "30,00",
      value: "1.678,61",
    });
    expect(resultado!.fields.some((f) => f.label.includes("Base"))).toBe(false);
  });

  it("extrai mes e ano do periodo", () => {
    const resultado = tentarLayoutTabular(TEXTO_PAGINA_1, 1);
    expect(resultado!.month).toBe("10");
    expect(resultado!.year).toBe("2019");
  });

  it("retorna null quando o layout nao bate (assinatura ausente)", () => {
    const resultado = tentarLayoutTabular("texto qualquer sem estrutura de holerite", 1);
    expect(resultado).toBeNull();
  });
});
