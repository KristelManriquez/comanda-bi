import { io } from 'socket.io-client';
import { API_URL, MODO_API, tokenPersonal } from './http';
import { suscribir as suscribirStore } from './store';

/**
 * Avisos en tiempo real.
 *
 * - Modo demo: los cambios llegan desde store.js (otras pestañas del mismo navegador).
 * - Con servidor: llegan por Socket.IO. El comensal se conecta con el token de su
 *   mesa y solo recibe los avisos de esa mesa; el personal se conecta con su JWT.
 *
 * Uso: const desuscribir = suscribir(callback, { mesa: token })
 */
const sockets = new Map(); // una conexión por mesa / por sesión del personal

function socketPara(auth) {
  const clave = auth.mesa ? `mesa:${auth.mesa}` : `personal:${auth.jwt}`;
  if (!sockets.has(clave)) {
    // La URL de la API termina en /api; Socket.IO escucha en la raíz del servidor
    const servidor = API_URL.replace(/\/api$/, '');
    sockets.set(clave, io(servidor, { auth, transports: ['websocket', 'polling'] }));
  }
  return sockets.get(clave);
}

export function suscribir(callback, { mesa } = {}) {
  const desuscribirStore = suscribirStore(callback);
  if (!MODO_API) return desuscribirStore;

  const auth = mesa ? { mesa } : { jwt: tokenPersonal() };
  if (!auth.mesa && !auth.jwt) return desuscribirStore;
  const socket = socketPara(auth);
  socket.on('pedidos:cambio', callback);
  // Al reconectarse (por ejemplo, después de perder la señal) se recargan los datos
  socket.io.on('reconnect', callback);
  return () => {
    desuscribirStore();
    socket.off('pedidos:cambio', callback);
    socket.io.off('reconnect', callback);
  };
}
