import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PaginaTexto {
  page: number;
  texto: string;
  temCamadaTexto: boolean;
}

interface ItemPosicionado {
  str: string;
  x: number;
  y: number;
}

const TOLERANCIA_Y = 2; // diferenca de Y (px) ainda considerada a mesma linha
const GAP_COLUNA = 10; // espaco horizontal (px) que vira separador de coluna (tab)

// Agrupa os itens de texto do PDF em linhas visuais, usando a coordenada Y
// (posicao vertical) que o pdfjs devolve por item. Sem isso, o texto de
// documentos tabulares (holerite, cartao de ponto) sai como um blob corrido,
// sem separacao confiavel entre linhas/colunas.
function agruparEmLinhas(items: ItemPosicionado[]): string[] {
  const ordenados = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const linhas: ItemPosicionado[][] = [];
  for (const item of ordenados) {
    const ultimaLinha = linhas[linhas.length - 1];
    const ultimoItem = ultimaLinha?.[ultimaLinha.length - 1];
    if (ultimaLinha && ultimoItem && Math.abs(ultimoItem.y - item.y) <= TOLERANCIA_Y) {
      ultimaLinha.push(item);
    } else {
      linhas.push([item]);
    }
  }

  return linhas
    .map((linha) => {
      linha.sort((a, b) => a.x - b.x);
      let texto = "";
      for (let i = 0; i < linha.length; i++) {
        if (i > 0) {
          const gap = linha[i].x - linha[i - 1].x;
          texto += gap > GAP_COLUNA ? "\t" : " ";
        }
        texto += linha[i].str;
      }
      return texto.trim();
    })
    .filter((l) => l.length > 0);
}

// Extrai o texto embutido de cada pagina, linha por linha (ordem visual).
// Se vier vazio, a pagina e imagem escaneada e precisa passar por OCR.
export async function extrairTextoPorPagina(buffer: Buffer): Promise<PaginaTexto[]> {
  const uint8 = new Uint8Array(buffer);
  const doc = await getDocument({ data: uint8 }).promise;
  const paginas: PaginaTexto[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();

    const items: ItemPosicionado[] = conteudo.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }));

    const linhas = agruparEmLinhas(items);
    const texto = linhas.join("\n");

    paginas.push({
      page: i,
      texto,
      temCamadaTexto: texto.trim().length > 0,
    });
  }

  return paginas;
}
