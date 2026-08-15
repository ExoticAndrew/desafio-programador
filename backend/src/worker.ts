import { salvar, buscar } from "./store";
import { Transcricao, TipoDocumento, TranscricaoValue } from "./types";

// Dado mockado so pra validar o fluxo assincrono e o contrato HTTP.
// Sera substituido pelo extrator real (texto/OCR) nos passos 6 e 7.
function mockValue(tipo: TipoDocumento): TranscricaoValue {
  if (tipo === "cartao-ponto") {
    return {
      pages: [
        {
          page: 1,
          days: [
            {
              date_raw: "01/05/2024",
              punches: [
                { kind: "IN", time_raw: "08:00", time_hhmm: "08:00" },
                { kind: "OUT", time_raw: "17:00", time_hhmm: "17:00" },
              ],
            },
          ],
        },
      ],
    };
  }
  return {
    pages: [
      {
        page: 1,
        year: "2024",
        month: "05",
        fields: [
          { code: "0010", label: "Salario Base", reference: "220,00", value: "2.000,00" },
        ],
        bases: [{ label: "Valor Liquido", value: "1.800,00" }],
      },
    ],
  };
}

export function iniciarProcessamento(id: string): void {
  setTimeout(() => {
    const atual = buscar(id);
    if (!atual) return;
    const concluido: Transcricao = {
      ...atual,
      status: "concluido",
      value: mockValue(atual.tipo),
    };
    salvar(concluido);
  }, 2000);
}
