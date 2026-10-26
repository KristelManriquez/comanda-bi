/**
 * Estados de un pedido. Deben coincidir con los valores que
 * se guarden en la columna pedido.estado de PostgreSQL.
 *
 * - solicitado: el comensal envió el pedido; la cocina lo ve en su pantalla.
 * - recibido:   el garzón entregó el pedido en la mesa y lo marcó como recibido.
 *
 * La cocina solo visualiza los pedidos (no manipula el dispositivo
 * mientras cocina); el garzón es quien cambia el estado.
 */
export const ESTADOS_PEDIDO = {
  SOLICITADO: 'solicitado',
  RECIBIDO: 'recibido',
};

/** Orden y textos que ve el comensal en el seguimiento. */
export const PASOS_PEDIDO = [
  {
    estado: ESTADOS_PEDIDO.SOLICITADO,
    titulo: 'Solicitado',
    detalle: 'Tu pedido llegó a la cocina y se está preparando.',
  },
  {
    estado: ESTADOS_PEDIDO.RECIBIDO,
    titulo: 'Recibido',
    detalle: 'El garzón entregó tu pedido en la mesa. ¡Que lo disfrutes!',
  },
];

export function indiceEstado(estado) {
  return PASOS_PEDIDO.findIndex((p) => p.estado === estado);
}

export function textoEstado(estado) {
  return PASOS_PEDIDO.find((p) => p.estado === estado)?.titulo ?? estado;
}
