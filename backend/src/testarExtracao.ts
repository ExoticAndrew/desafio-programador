import fs from "fs";
import path from "path";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarLayoutFichaFinanceira } from "./holeriteFichaFinanceira";

async function main() {
  const pasta = path.join(__dirname, "..", "..", "exemplos");
  const buffer = fs.readFileSync(path.join(pasta, "payroll-01.pdf"));
  const paginas = await extrairTextoPorPagina(buffer);

  for (const p of paginas) {
    const resultado = tentarLayoutFichaFinanceira(p.texto, p.page);
    console.log(`\n=== pagina ${p.page} ===`);
    if (!resultado) {
      console.log("NAO RECONHECIDO pelo layout ficha financeira");
      continue;
    }
    for (const competencia of resultado) {
      console.log(`  ${competencia.month}/${competencia.year} | ${competencia.fields.length} campos | ${competencia.bases.length} bases`);
    }
  }
}

main().catch(console.error);
