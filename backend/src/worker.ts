import { salvar, buscar } from "./store";
import { TipoDocumento, TranscricaoValue, HoleritePage } from "./types";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarParsearHolerite } from "./holeriteRouter";

// TODO (proximo passo): extrator real de cartao de ponto. Por enquanto
// mantem o mock so pra esse tipo, ate implementarmos o parser dedicado.
function mockCartaoPonto() {
  return {
    pages: [
      {
        page: 1,
        days: [
          {
            date_raw: "01/05/2024",
            punches: [
              { kind: "IN" as const, time_raw: "08:00", time_hhmm: "08:00" },
              { kind: "OUT" as const, time_raw: "17:00", time_hhmm: "17:00" },
            ],
          },
        ],
      },
    ],
  };
}

async function processarHolerite(buffer: Buffer): Promise<TranscricaoValue> {
  const paginasTexto = await extrairTextoPorPagina(buffer);
  const pages: HoleritePage[] = [];

  for (const p of paginasTexto) {
    const reconhecido = tentarParsearHolerite(p.texto, p.page);
    if (reconhecido) {
      pages.push(...reconhecido);
    } else {
      pages.push({ page: p.page, year: "", month: "", fields: [], bases: [] });
    }
  }

  return { pages };
}

export function iniciarProcessamento(id: string, buffer: Buffer, tipo: TipoDocumento): void {
  (async () => {
    try {
      const value: TranscricaoValue =
        tipo === "holerite" ? await processarHolerite(buffer) : mockCartaoPonto();

      const atual = buscar(id);
      if (!atual) return;
      salvar({ ...atual, status: "concluido", value });
    } catch (err) {
      const atual = buscar(id);
      if (!atual) return;
      const mensagem = err instanceof Error ? err.message : "erro desconhecido ao processar";
      salvar({ ...atual, status: "erro", erro: mensagem });
    }
  })();
}
