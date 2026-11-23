import { Server } from 'socket.io';
import { query } from '../db/pool.js';
import { verificarToken } from '../services/auth.js';

/**
 * Tiempo real con Socket.IO.
 * - El personal se conecta con su JWT y entra a la sala "personal".
 * - El comensal se conecta con el token del QR y entra a la sala de su mesa.
 * Los avisos solo dicen "cambiaron los pedidos": cada pantalla vuelve a pedir
 * sus datos a la API, que es la que controla qué puede ver cada uno.
 */
let io = null;

export function iniciarSockets(httpServer, origenes) {
  io = new Server(httpServer, { cors: { origin: origenes } });

  io.on('connection', async (socket) => {
    const { jwt, mesa } = socket.handshake.auth ?? {};
    if (jwt && verificarToken(jwt)) {
      socket.join('personal');
    } else if (mesa) {
      const { rows } = await query('SELECT id FROM mesa WHERE token_qr = $1 AND activa', [String(mesa)]);
      if (rows[0]) socket.join(`mesa:${rows[0].id}`);
      else socket.disconnect(true);
    } else {
      socket.disconnect(true);
    }
  });
}

/** Avisa al personal y a la mesa que sus pedidos cambiaron. */
export function avisarCambioPedidos(mesaId) {
  if (!io) return;
  io.to('personal').to(`mesa:${mesaId}`).emit('pedidos:cambio');
}

/** Avisa a todas las pantallas (personal y mesas) que cambió la carta, las mesas o los usuarios. */
export function avisarCambioGeneral() {
  if (!io) return;
  io.emit('pedidos:cambio');
}
