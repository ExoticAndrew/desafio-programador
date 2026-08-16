import fs from "fs";
import path from "path";
import { renderizarPaginaComoImagem, ocrImagem } from "./ocr";
import { tentarParsearCartaoPontoOCR } from "./cartaoPontoOCR";

async function main() {
  const pasta = path.join(__dirname, "..", "..", "exemplos");
  const buffer = fs.readFileSync(path.join(pasta, "time-card-02.pdf"));

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;

  for (let pagina = 1; pagina <= doc.numPages; pagina++) {
    console.log(`\nProcessando pagina ${pagina}...`);
    const imagem = await renderizarPaginaComoImagem(buffer, pagina);
    const texto = await ocrImagem(imagem);
    const resultado = tentarParsearCartaoPontoOCR(texto, pagina);
    if (!resultado) {
      console.log(`pagina ${pagina}: NAO RECONHECIDO`);
      continue;
    }
    const semBatida = resultado.days.filter(d => d.punches.length === 0).length;
    console.log(`pagina ${pagina}: ${resultado.days.length} dias (${resultado.days.length - semBatida} com batida, ${semBatida} sem)`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
