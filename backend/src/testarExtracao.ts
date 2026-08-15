import fs from "fs";
import path from "path";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarParsearCartaoPonto } from "./cartaoPontoTexto";

async function main() {
  const pasta = path.join(__dirname, "..", "..", "exemplos");
  const buffer = fs.readFileSync(path.join(pasta, "time-card-01.pdf"));
  const paginas = await extrairTextoPorPagina(buffer);
  for (const p of paginas) {
    const resultado = tentarParsearCartaoPonto(p.texto, p.page);
    if (!resultado) {
      console.log(`pagina ${p.page}: NAO RECONHECIDO`);
      continue;
    }
    const semBatida = resultado.days.filter(d => d.punches.length === 0).length;
    const comBatida = resultado.days.length - semBatida;
    console.log(`pagina ${p.page}: ${resultado.days.length} dias (${comBatida} com batida, ${semBatida} sem)`);
  }
}
main().catch(console.error);
