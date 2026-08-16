import { useState, useEffect } from "react";
import { TextField } from "@mui/material";

interface Props {
  valor: string;
  onCommit: (novoValor: string) => void;
}

export function CelulaEditavel({ valor, onCommit }: Props) {
  const [local, setLocal] = useState(valor);

  useEffect(() => {
    setLocal(valor);
  }, [valor]);

  return (
    <TextField
      variant="standard"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== valor) onCommit(local);
      }}
    />
  );
}
