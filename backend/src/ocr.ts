import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";

// O pdfjs-dist detecta automaticamente o ambiente Node e usa @napi-rs/canvas
// internamente para renderizar - nao precisa de factory customizada, so
// dessa dependencia instalada. Escala 2x melhora a acuracia do OCR em texto
// pequeno (PDF escaneado em ~72-150dpi fica ruim direto pro Tesseract).
const ESCALA_RENDER = 2;

export async function renderizarPaginaComoImagem(buffer: Buffer, numeroPagina: number): Promise<Buffer> {
  const uint8 = new Uint8Array(buffer);
  const doc = await getDocument({ data: uint8 }).promise;
  const pagina = await doc.getPage(numeroPagina);
  const viewport = pagina.getViewport({ scale: ESCALA_RENDER });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await pagina.render({
    canvasContext: context as any,
    canvas: canvas as any,
    viewport,
  }).promise;

  return canvas.toBuffer("image/png");
}

let workerPromise: ReturnType<typeof createWorker> | null = null;

// Um worker Tesseract reutilizado entre chamadas - criar um novo por
// pagina seria caro (carrega o modelo de idioma toda vez).
async function obterWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("por");
  }
  return workerPromise;
}

export async function ocrImagem(imagemBuffer: Buffer): Promise<string> {
  const worker = await obterWorker();
  const { data } = await worker.recognize(imagemBuffer);
  return data.text;
}
