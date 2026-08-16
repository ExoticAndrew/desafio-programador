import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
} from "@mui/material";
import type { Transcricao, CartaoPontoPage, HoleritePage } from "../types";
import { CelulaEditavel } from "./CelulaEditavel";
import { transformarCartaoPonto, transformarHolerite } from "../tabela";
import { atualizarCelulaCartaoPonto, atualizarCelulaHolerite } from "../edicao";
import { calcularAvisosCartaoPonto, calcularAvisosHolerite } from "../avisos";
import { salvarTranscricao } from "../api";

const COR_AMARELO = "#FFF3CD";
const COR_VERMELHO = "#F8D7DA";
const BORDA_VERMELHA = "3px solid #DC3545";

function contemIncerteza(valores: string[]): boolean {
  return valores.some((v) => v.includes("?"));
}

function corDaLinha(amarelo: boolean, vermelho: boolean): { bgcolor?: string; borderLeft?: string } {
  if (vermelho) return { bgcolor: COR_VERMELHO, borderLeft: BORDA_VERMELHA };
  if (amarelo) return { bgcolor: COR_AMARELO };
  return {};
}

interface Props {
  transcricao: Transcricao;
}

export function TabelaRevisao({ transcricao }: Props) {
  const [valor, setValor] = useState(transcricao.value);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const pagesCartao = (valor?.pages ?? []) as CartaoPontoPage[];
  const pagesHolerite = (valor?.pages ?? []) as HoleritePage[];
  const tabelaCartao = useMemo(() => transformarCartaoPonto(pagesCartao), [pagesCartao]);
  const tabelaHolerite = useMemo(() => transformarHolerite(pagesHolerite), [pagesHolerite]);
  const avisosCartao = useMemo(() => calcularAvisosCartaoPonto(pagesCartao), [pagesCartao]);
  const avisosHolerite = useMemo(() => calcularAvisosHolerite(pagesHolerite), [pagesHolerite]);

  if (!valor) return null;

  async function handleSalvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      await salvarTranscricao(transcricao.id, valor);
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const botaoSalvar = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Button variant="contained" onClick={handleSalvar} disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar correcoes"}
      </Button>
      {salvo && <Alert severity="success" sx={{ py: 0 }}>Correcoes salvas</Alert>}
      {erro && <Alert severity="error" sx={{ py: 0 }}>{erro}</Alert>}
    </Box>
  );

  if (transcricao.tipo === "cartao-ponto") {
    const { colunas, linhas } = tabelaCartao;

    const editarCelula = (page: number, dayIndex: number, colIndex: number, novoValor: string) => {
      setValor({ pages: atualizarCelulaCartaoPonto(pagesCartao, page, dayIndex, colIndex, novoValor) });
      setSalvo(false);
    };

    return (
      <Box>
        {botaoSalvar}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: "#173772", color: "white", fontWeight: "bold" } }}>
                {colunas.map((c) => (
                  <TableCell key={c} sx={{ color: "inherit" }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {linhas.map((linha) => {
                const aviso = avisosCartao.get(`${linha.page}:${linha.dayIndex}`);
                const todasCelulas = [linha.date_raw, ...linha.celulas];
                const estilo = corDaLinha(
                  !!aviso?.batidasImpares || contemIncerteza(todasCelulas),
                  !!aviso?.dataNaoSequencial
                );
                return (
                  <TableRow key={`${linha.page}-${linha.dayIndex}`} sx={estilo}>
                    <TableCell>
                      <CelulaEditavel
                        valor={linha.date_raw}
                        onCommit={(v) => editarCelula(linha.page, linha.dayIndex, 0, v)}
                      />
                    </TableCell>
                    {linha.celulas.map((valorCelula, i) => (
                      <TableCell key={i}>
                        <CelulaEditavel
                          valor={valorCelula}
                          onCommit={(v) => editarCelula(linha.page, linha.dayIndex, i + 1, v)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  const { colunas, linhas } = tabelaHolerite;

  if (linhas.length === 0) {
    return <Typography color="text.secondary">Nenhum dado extraido.</Typography>;
  }

  const editarCelulaHolerite = (pageIndex: number, label: string, novoValor: string) => {
    setValor({ pages: atualizarCelulaHolerite(pagesHolerite, pageIndex, label, novoValor) });
    setSalvo(false);
  };

  return (
    <Box>
      {botaoSalvar}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "#173772", color: "white", fontWeight: "bold" } }}>
              <TableCell sx={{ color: "inherit" }}>Pag.</TableCell>
              <TableCell sx={{ color: "inherit" }}>Mes</TableCell>
              <TableCell sx={{ color: "inherit" }}>Ano</TableCell>
              {colunas.slice(3).map((c) => (
                <TableCell key={c} sx={{ color: "inherit" }}>{c}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {linhas.map((linha) => {
              const aviso = avisosHolerite.get(linha.pageIndex);
              const estilo = corDaLinha(
                !!aviso?.paginaVazia || contemIncerteza(linha.celulas),
                !!aviso?.mesNaoSequencial
              );
              return (
                <TableRow key={linha.pageIndex} sx={estilo}>
                  <TableCell>{linha.page}</TableCell>
                  <TableCell>{linha.mes}</TableCell>
                  <TableCell>{linha.ano}</TableCell>
                  {linha.celulas.map((valorCelula, i) => (
                    <TableCell key={i}>
                      <CelulaEditavel
                        valor={valorCelula}
                        onCommit={(v) => editarCelulaHolerite(linha.pageIndex, colunas[i + 3], v)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
