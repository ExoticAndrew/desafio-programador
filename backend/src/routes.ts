import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { salvar, buscar, atualizarValue, salvarPdfBuffer, buscarPdfBuffer } from "./store";
import { iniciarProcessamento } from "./worker";
import { Transcricao, TipoDocumento } from "./types";
import { gerarXlsx, gerarCsv } from "./planilha";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const TIPOS_VALIDOS: TipoDocumento[] = ["cartao-ponto", "holerite"];

function ehPdfValido(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

router.post(
  "/transcricoes",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("arquivo")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ erro: "arquivo excede o limite de 20MB" });
      }
      if (err) return res.status(400).json({ erro: "falha ao processar upload" });
      next();
    });
  },
  (req: Request, res: Response) => {
    const { tipo } = req.body ?? {};
    const arquivo = req.file;
    if (!arquivo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ erro: "arquivo e tipo (cartao-ponto|holerite) sao obrigatorios" });
    }
    if (!ehPdfValido(arquivo.buffer)) {
      return res.status(400).json({ erro: "arquivo enviado nao e um PDF valido" });
    }
    const id = randomUUID();
    const transcricao: Transcricao = { id, tipo, status: "processando", erro: null, value: null };
    salvar(transcricao);
    salvarPdfBuffer(id, arquivo.buffer);
    iniciarProcessamento(id, arquivo.buffer, tipo);
    res.status(202).json({ id });
  }
);

router.get("/transcricoes/:id", (req: Request, res: Response) => {
  const transcricao = buscar(req.params.id as string);
  if (!transcricao) return res.status(404).json({ erro: "transcricao nao encontrada" });
  res.status(200).json(transcricao);
});

router.put("/transcricoes/:id", (req: Request, res: Response) => {
  const { value } = req.body;
  const atualizado = atualizarValue(req.params.id as string, value);
  if (!atualizado) return res.status(404).json({ erro: "transcricao nao encontrada" });
  res.status(200).json(atualizado);
});

router.get("/transcricoes/:id/planilha", async (req: Request, res: Response) => {
  const transcricao = buscar(req.params.id as string);
  if (!transcricao) return res.status(404).json({ erro: "transcricao nao encontrada" });
  if (transcricao.status !== "concluido") {
    return res.status(409).json({ erro: "transcricao ainda nao concluida" });
  }

  const formato = (req.query.formato as string) || "xlsx";

  if (formato === "json") {
    return res.status(200).json(transcricao.value);
  }

  if (formato === "csv") {
    const csv = "\uFEFF" + gerarCsv(transcricao);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="planilha-${transcricao.id}.csv"`);
    return res.status(200).send(csv);
  }

  if (formato === "xlsx") {
    const buffer = await gerarXlsx(transcricao);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="planilha-${transcricao.id}.xlsx"`);
    return res.status(200).send(buffer);
  }

  return res.status(400).json({ erro: `formato ${formato} nao suportado (use xlsx, csv ou json)` });
});

router.get("/transcricoes/:id/pdf", (req: Request, res: Response) => {
  const id = req.params.id as string;
  const transcricao = buscar(id);
  if (!transcricao) return res.status(404).json({ erro: "transcricao nao encontrada" });

  const buffer = buscarPdfBuffer(id);
  if (!buffer) return res.status(404).json({ erro: "pdf original nao disponivel" });

  res.setHeader("Content-Type", "application/pdf");
  res.status(200).send(buffer);
});

export default router;




