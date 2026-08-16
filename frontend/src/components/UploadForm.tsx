import { useState, useRef } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import type { TipoDocumento, Transcricao } from "../types";
import { enviarTranscricao, buscarTranscricao } from "../api";

const INTERVALO_POLLING_MS = 2000;
const MAX_TENTATIVAS_POLLING = 60;

interface Props {
  onConcluido: (transcricao: Transcricao) => void;
}

export function UploadForm({ onConcluido }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoDocumento | "">("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cancelarPolling = useRef(false);

  const handleTipoChange = (e: SelectChangeEvent) => {
    setTipo(e.target.value as TipoDocumento);
  };

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArquivo(e.target.files?.[0] ?? null);
  };

  async function aguardarConclusao(id: string): Promise<void> {
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS_POLLING; tentativa++) {
      if (cancelarPolling.current) return;
      const transcricao = await buscarTranscricao(id);
      if (transcricao.status === "concluido") {
        onConcluido(transcricao);
        return;
      }
      if (transcricao.status === "erro") {
        throw new Error(transcricao.erro || "Falha ao processar o documento");
      }
      await new Promise((resolve) => setTimeout(resolve, INTERVALO_POLLING_MS));
    }
    throw new Error("Processamento demorou mais que o esperado - tente novamente");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo || !tipo) return;
    setErro(null);
    setProcessando(true);
    cancelarPolling.current = false;
    try {
      const { id } = await enviarTranscricao(arquivo, tipo);
      await aguardarConclusao(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
      <Typography variant="h6">Enviar documento</Typography>
      <FormControl fullWidth disabled={processando}>
        <InputLabel id="tipo-label">Tipo de documento</InputLabel>
        <Select labelId="tipo-label" value={tipo} label="Tipo de documento" onChange={handleTipoChange}>
          <MenuItem value="cartao-ponto">Cartao de ponto</MenuItem>
          <MenuItem value="holerite">Holerite</MenuItem>
        </Select>
      </FormControl>
      <Button variant="outlined" component="label" disabled={processando}>
        {arquivo ? arquivo.name : "Escolher PDF"}
        <input type="file" accept="application/pdf" hidden onChange={handleArquivoChange} />
      </Button>
      <Button type="submit" variant="contained" disabled={!arquivo || !tipo || processando}>
        {processando ? "Processando..." : "Enviar"}
      </Button>
      {processando && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Aguardando processamento do documento...</Typography>
        </Box>
      )}
      {erro && <Alert severity="error">{erro}</Alert>}
    </Box>
  );
}
