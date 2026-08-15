import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { salvar, buscar, atualizarValue } from "./store";
import { iniciarProcessamento } from "./worker";
import { Transcricao, TipoDocumento } from "./types";

const router = Router();

// Limite de upload e checagem de tipo real ficam completos no passo 4 -
// aqui so o suficiente pro esqueleto nao quebrar com arquivo grande.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const TIPOS_VALIDOS: TipoDocumento[] = ["cartao-ponto", "holerite"];

router.post("/transcricoes", upload.single("arquivo"), (req: Request, res: Response) => {
  const { tipo } = req.body ?? {};
  const arquivo = req.file;

  if (!arquivo || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: "arquivo e tipo (cartao-ponto|holerite) sao obrigatorios" });
  }

  const id = randomUUID();
  const transcricao: Transcricao = { id, tipo, status: "processando", erro: null, value: null };
  salvar(transcricao);
  iniciarProcessamento(id);

  res.status(202).json({ id });
});

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

router.get("/transcricoes/:id/planilha", (req: Request, res: Response) => {
  const transcricao = buscar(req.params.id as string);
  if (!transcricao) return res.status(404).json({ erro: "transcricao nao encontrada" });

  const formato = (req.query.formato as string) || "xlsx";
  // Geracao real (exceljs, csv) entra no passo 9 - aqui so valida o roteamento.
  if (formato === "json") {
    return res.status(200).json(transcricao.value);
  }
  return res.status(501).json({ erro: `formato ${formato} ainda nao implementado (passo 9)` });
});

export default router;
