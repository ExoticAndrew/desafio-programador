import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PaginaTexto {
  page: number;
  texto: string;
  temCamadaTexto: boolean;
}

// Extrai o texto embutido de cada pagina. Se vier vazio (so espacos),
// a pagina e imagem escaneada e precisa passar por OCR (proximo passo).
export async function extrairTextoPorPagina(buffer: Buffer): Promise<PaginaTexto[]> {
  const uint8 = new Uint8Array(buffer);
  const doc = await getDocument({ data: uint8 }).promise;
  const paginas: PaginaTexto[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    const texto = conteudo.items.map((item: any) => item.str).join(" ").trim();

    paginas.push({
      page: i,
      texto,
      temCamadaTexto: texto.length > 0,
    });
  }

  return paginas;
}
