import { HoleritePage } from "./types";
import { tentarLayoutTabular } from "./holeriteTabular";
import { tentarLayoutFichaFinanceira } from "./holeriteFichaFinanceira";
import { tentarLayoutDeclaracao } from "./holeriteDeclaracao";

// Tenta cada parser de layout conhecido, na ordem. Se nenhum reconhecer o
// texto (ex: payroll-04, que tem camada de texto mas so o carimbo de
// assinatura - sem dado real), retorna null e o chamador deve cair para OCR.
export function tentarParsearHolerite(texto: string, page: number): HoleritePage[] | null {
  const tabular = tentarLayoutTabular(texto, page);
  if (tabular) return [tabular];

  const ficha = tentarLayoutFichaFinanceira(texto, page);
  if (ficha) return ficha;

  const declaracao = tentarLayoutDeclaracao(texto, page);
  if (declaracao) return declaracao;

  return null;
}
