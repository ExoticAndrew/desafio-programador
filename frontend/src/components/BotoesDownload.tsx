import { Box, Button } from "@mui/material";
import { API_URL } from "../api";

interface Props {
  id: string;
}

export function BotoesDownload({ id }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
      <Button
        variant="outlined"
        component="a"
        href={`${API_URL}/api/transcricoes/${id}/planilha?formato=xlsx`}
      >
        Baixar XLSX
      </Button>
      <Button
        variant="outlined"
        component="a"
        href={`${API_URL}/api/transcricoes/${id}/planilha?formato=csv`}
      >
        Baixar CSV
      </Button>
    </Box>
  );
}
