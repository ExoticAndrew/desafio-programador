import fs from "fs";
import path from "path";
import { extrairTextoPorPagina } from "./pdfText";
import { tentarParsearHolerite } from "./holeriteRouter";

async function main() {
  const pasta = path.join(__dirname, "..", "..", "exemplos");
  const arquivos = ["payroll-01.pdf", "payroll-02.pdf", "payroll-03.pdf", "payroll-04.pdf"];

  for (const arquivo of arquivos) {
    const buffer = fs.readFileSync(path.join(pasta, arquivo));
    const paginas = await extrairTextoPorPagina(buffer);
    console.log(`\n### ${arquivo} ###`);
    for (const p of paginas) {
      const resultado = tentarParsearHolerite(p.texto, p.page);
      if (!resultado) {
        console.log(`  pagina ${p.page}: NAO RECONHECIDO (cai pro OCR)`);
        continue;
      }
      for (const c of resultado) {
        console.log(`  pagina ${p.page}: ${c.month}/${c.year} | ${c.fields.length} campos | ${c.bases.length} bases`);
      }
    }
  }
}

main().catch(console.error);
