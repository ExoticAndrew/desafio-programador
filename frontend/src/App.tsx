import { useState } from "react";
import { Container, Typography, Box } from "@mui/material";
import { UploadForm } from "./components/UploadForm";
import type { Transcricao } from "./types";

function App() {
  const [resultado, setResultado] = useState<Transcricao | null>(null);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quick Filler
      </Typography>

      <UploadForm onConcluido={setResultado} />

      {resultado && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Transcricao concluida (id: {resultado.id})</Typography>
          <pre style={{ overflow: "auto", maxHeight: 400, background: "#f5f5f5", padding: 8 }}>
            {JSON.stringify(resultado.value, null, 2)}
          </pre>
        </Box>
      )}
    </Container>
  );
}

export default App;
