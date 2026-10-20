/**
 * Estados de un pedido. Deben coincidir con los valores que
 * se guarden en la columna pedido.estado de PostgreSQL.
 */
export const ESTADOS_PEDIDO = {
  RECIBIDO: 'recibido',
  EN_PREPARACION: 'en_preparacion',
  LISTO: 'listo',
  ENTREGADO: 'entregado',
};

/** Orden y textos que ve el comensal en el seguimiento. */
export const PASOS_PEDIDO = [
  {
    estado: ESTADOS_PEDIDO.RECIBIDO,
    titulo: 'Recibido',
    detalle: 'Tu pedido llegó al garzón y a la cocina.',
  },
  {
    estado: ESTADOS_PEDIDO.EN_PREPARACION,
    titulo: 'En preparación',
    detalle: 'La cocina está preparando tu pedido.',
  },
  {
    estado: ESTADOS_PEDIDO.LISTO,
    titulo: 'Listo',
    detalle: 'Tu pedido está listo y va en camino a tu mesa.',
  },
  {
    estado: ESTADOS_PEDIDO.ENTREGADO,
    titulo: 'Entregado',
    detalle: '¡Que lo disfrutes!',
  },
];

export function indiceEstado(estado) {
  return PASOS_PEDIDO.findIndex((p) => p.estado === estado);
}

export function textoEstado(estado) {
  return PASOS_PEDIDO.find((p) => p.estado === estado)?.titulo ?? estado;
}
