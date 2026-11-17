import { useEffect, useRef, useState } from 'react';

/** Mensaje breve de confirmación o error que desaparece solo. */
export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const contador = useRef(0);
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(id);
  }, [aviso]);
  const mostrar = (texto, esError = false) => setAviso({ id: ++contador.current, texto, esError });
  return [aviso, mostrar];
}
