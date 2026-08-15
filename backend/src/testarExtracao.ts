import fs from "fs";
import path from "path";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarLayoutDeclaracao } from "./holeriteDeclaracao";

async function main() {
  const pasta = path.join(__dirname, "..", "..", "exemplos");
  const buffer = fs.readFileSync(path.join(pasta, "payroll-02.pdf"));
  const paginas = await extrairTextoPorPagina(buffer);

  for (const p of paginas) {
    const resultado = tentarLayoutDeclaracao(p.texto, p.page);
    console.log(`\n=== pagina ${p.page} ===`);
    if (!resultado) {
      console.log("NAO RECONHECIDO pelo layout declaracao");
      continue;
    }
    for (const competencia of resultado) {
      console.log(`  ${competencia.month}/${competencia.year} | ${competencia.fields.length} campos | ${competencia.bases.length} bases`);
    }
  }
}

main().catch(console.error);
