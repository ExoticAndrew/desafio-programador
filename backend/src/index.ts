import express from "express";
import cors from "cors";
import "dotenv/config";
import transcricoesRouter from "./routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/healthz", (_req, res) => res.status(200).send("OK"));
app.use("/api", transcricoesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));

export default app;
