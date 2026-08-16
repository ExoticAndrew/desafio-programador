import { useState } from "react";
import { Container, Typography, Box, Grid } from "@mui/material";
import { UploadForm } from "./components/UploadForm";
import { TabelaRevisao } from "./components/TabelaRevisao";
import { BotoesDownload } from "./components/BotoesDownload";
import { VisualizadorPdf } from "./components/VisualizadorPdf";
import type { Transcricao } from "./types";

function App() {
  const [resultado, setResultado] = useState<Transcricao | null>(null);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quick Filler
      </Typography>

      <UploadForm onConcluido={setResultado} />

      {resultado && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Transcricao concluida (id: {resultado.id})
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TabelaRevisao transcricao={resultado} />
              <BotoesDownload id={resultado.id} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <VisualizadorPdf id={resultado.id} />
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
}

export default App;
