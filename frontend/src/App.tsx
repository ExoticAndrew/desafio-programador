import { useState } from "react";
import { Container, Typography, Box } from "@mui/material";
import { UploadForm } from "./components/UploadForm";
import { TabelaRevisao } from "./components/TabelaRevisao";
import type { Transcricao } from "./types";

function App() {
  const [resultado, setResultado] = useState<Transcricao | null>(null);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quick Filler
      </Typography>

      <UploadForm onConcluido={setResultado} />

      {resultado && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Transcricao concluida (id: {resultado.id})
          </Typography>
          <TabelaRevisao transcricao={resultado} />
        </Box>
      )}
    </Container>
  );
}

export default App;
