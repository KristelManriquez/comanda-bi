/**
 * Capa de acceso a datos del comensal.
 *
 * HOY: trabaja con datos simulados (mockData) y guarda los pedidos
 * en localStorage, simulando que la cocina los va avanzando.
 *
 * MAÑANA: cada función se reemplaza por una llamada a la API REST,
 * por ejemplo:
 *
 *   export async function getCarta() {
 *     const res = await fetch(`${API_URL}/carta`);
 *     if (!res.ok) throw new Error('No se pudo cargar la carta');
 *     return res.json();
 *   }
 *
 * Los componentes no cambian, porque solo conocen estas funciones.
 */

import { restaurante, mesas, categorias, productos } from '../data/mockData';
import { ESTADOS_PEDIDO } from '../utils/pedido';

// Cuando exista el backend: import.meta.env.VITE_API_URL (ej. http://localhost:4000/api)
// eslint-disable-next-line no-unused-vars
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const PEDIDOS_KEY = 'fork:pedidos';

// Simula la latencia de red para poder ver los estados de carga.
const esperar = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/** GET /api/mesas/:token -> valida el token del QR */
export async function getMesaPorToken(token) {
  await esperar(200);
  const mesa = mesas.find((m) => m.token_qr === token && m.activa);
  if (!mesa) {
    const error = new Error('Mesa no encontrada');
    error.status = 404;
    throw error;
  }
  return mesa;
}

/** GET /api/carta -> restaurante + categorías con sus productos */
export async function getCarta() {
  await esperar();
  return {
    restaurante,
    categorias: categorias
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        ...c,
        productos: productos.filter((p) => p.categoria_id === c.id),
      })),
  };
}

/* ---------------- Pedidos (simulados) ---------------- */

function leerPedidos() {
  try {
    return JSON.parse(localStorage.getItem(PEDIDOS_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarPedidos(pedidos) {
  try {
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(pedidos));
  } catch {
    /* sin almacenamiento disponible: el pedido vive solo en memoria */
  }
}

/**
 * Simulación de cocina: el estado avanza según el tiempo transcurrido.
 * En el sistema real el estado lo cambian el garzón/cocina y llega
 * al teléfono del comensal por Socket.IO.
 */
const LINEA_DE_TIEMPO = [
  { desde: 0, estado: ESTADOS_PEDIDO.RECIBIDO },
  { desde: 15, estado: ESTADOS_PEDIDO.EN_PREPARACION },
  { desde: 45, estado: ESTADOS_PEDIDO.LISTO },
  { desde: 70, estado: ESTADOS_PEDIDO.ENTREGADO },
];

function conEstadoSimulado(pedido) {
  const segundos = (Date.now() - new Date(pedido.creado_en).getTime()) / 1000;
  const paso = LINEA_DE_TIEMPO.filter((p) => segundos >= p.desde).at(-1);
  return { ...pedido, estado: paso.estado };
}

/**
 * POST /api/pedidos
 * body: { token_mesa, items: [{ producto_id, cantidad, nota }] }
 * El backend real calcula los precios desde la BD (nunca confía
 * en el precio que envía el cliente) y los copia a detalle_pedido.
 */
export async function crearPedido({ tokenMesa, items }) {
  await esperar(600);
  const mesa = await getMesaPorToken(tokenMesa);

  const detalle = items.map((item) => {
    const producto = productos.find((p) => p.id === item.producto_id);
    if (!producto || !producto.disponible) {
      throw new Error(`${producto?.nombre ?? 'Un producto'} ya no está disponible`);
    }
    return {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: producto.precio,
      nota: item.nota || '',
    };
  });

  const pedidos = leerPedidos();
  const pedido = {
    id: 1000 + pedidos.length + 1,
    mesa_id: mesa.id,
    mesa_numero: mesa.numero,
    token_mesa: tokenMesa,
    creado_en: new Date().toISOString(),
    detalle,
    total: detalle.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0),
  };
  guardarPedidos([...pedidos, pedido]);
  return conEstadoSimulado(pedido);
}

/** GET /api/pedidos/:id */
export async function getPedido(id) {
  await esperar(150);
  const pedido = leerPedidos().find((p) => p.id === Number(id));
  if (!pedido) {
    const error = new Error('Pedido no encontrado');
    error.status = 404;
    throw error;
  }
  return conEstadoSimulado(pedido);
}

/** GET /api/mesas/:token/pedidos -> pedidos de la cuenta abierta de la mesa */
export async function getPedidosDeMesa(tokenMesa) {
  await esperar(150);
  return leerPedidos()
    .filter((p) => p.token_mesa === tokenMesa)
    .map(conEstadoSimulado)
    .sort((a, b) => b.id - a.id);
}
