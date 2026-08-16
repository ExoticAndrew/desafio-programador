import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";
import type { Transcricao, CartaoPontoPage, HoleritePage } from "../types";
import { transformarCartaoPonto, transformarHolerite } from "../tabela";

interface Props {
  transcricao: Transcricao;
}

export function TabelaRevisao({ transcricao }: Props) {
  if (!transcricao.value) return null;

  if (transcricao.tipo === "cartao-ponto") {
    const { colunas, linhas } = transformarCartaoPonto(transcricao.value.pages as CartaoPontoPage[]);
    return (
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
            {linhas.map((linha) => (
              <TableRow key={`${linha.page}-${linha.dayIndex}`}>
                <TableCell>{linha.date_raw}</TableCell>
                {linha.celulas.map((valor, i) => (
                  <TableCell key={i}>{valor}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const { colunas, linhas } = transformarHolerite(transcricao.value.pages as HoleritePage[]);
  if (linhas.length === 0) {
    return <Typography color="text.secondary">Nenhum dado extraido.</Typography>;
  }

  return (
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
          {linhas.map((linha) => (
            <TableRow key={linha.pageIndex}>
              <TableCell>{linha.page}</TableCell>
              <TableCell>{linha.mes}</TableCell>
              <TableCell>{linha.ano}</TableCell>
              {linha.celulas.map((valor, i) => (
                <TableCell key={i}>{valor}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
