import { useCallback, useEffect, useState } from 'react';
import { suscribir } from '../services/tiempoReal';

/**
 * Carga datos con `cargar()` y los vuelve a cargar cada vez que cambian
 * (en la demo, por store.js; con el servidor, al recibir un aviso de Socket.IO).
 * `cadaMs` refresca además los tiempos transcurridos ("hace 5 min").
 */
export function useEnVivo(cargar, cadaMs = 30000) {
  const [datos, setDatos] = useState(null);
  const [, setTick] = useState(0);

  const recargar = useCallback(() => {
    Promise.resolve(cargar()).then(setDatos);
  }, [cargar]);

  useEffect(() => {
    recargar();
    const desuscribir = suscribir(recargar);
    const id = setInterval(() => setTick((t) => t + 1), cadaMs);
    return () => {
      desuscribir();
      clearInterval(id);
    };
  }, [recargar, cadaMs]);

  return [datos, recargar];
}
