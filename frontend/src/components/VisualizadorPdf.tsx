import { Box } from "@mui/material";
import { API_URL } from "../api";

interface Props {
  id: string;
}

export function VisualizadorPdf({ id }: Props) {
  return (
    <Box sx={{ height: "80vh", border: "1px solid #ccc" }}>
      <embed
        src={`${API_URL}/api/transcricoes/${id}/pdf`}
        type="application/pdf"
        width="100%"
        height="100%"
      />
    </Box>
  );
}
