/**
 * Capa de acceso a datos del comensal.
 *
 * HOY: trabaja con datos simulados (mockData) y guarda pedidos, cuentas
 * y eventos en localStorage (ver store.js).
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
import { COLECCIONES, leer, escribir, siguienteId } from './store';

export { suscribir } from './store';

// Cuando exista el backend: import.meta.env.VITE_API_URL (ej. http://localhost:4000/api)
// eslint-disable-next-line no-unused-vars
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Simula la latencia de red para poder ver los estados de carga.
export const esperar = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/** Productos con la disponibilidad que haya cambiado el administrador. */
export function productosVigentes() {
  const cambios = leer(COLECCIONES.DISPONIBILIDAD, {});
  return productos.map((p) => (p.id in cambios ? { ...p, disponible: cambios[p.id] } : p));
}

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

/** GET /api/carta -> restaurante + categorías con sus productos (sin costo) */
export async function getCarta() {
  await esperar();
  const vigentes = productosVigentes();
  return {
    restaurante,
    categorias: categorias
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        ...c,
        // eslint-disable-next-line no-unused-vars
        productos: vigentes.filter((p) => p.categoria_id === c.id).map(({ costo, ...p }) => p),
      })),
  };
}

/* ---------------- Eventos de navegación (anónimos) ---------------- */

/**
 * Identificador de sesión anónimo y aleatorio, distinto en cada pestaña.
 * No se asocia a ningún dato personal del comensal (Ley N.° 21.719).
 */
function sesionAnonima() {
  const KEY = 'fork:sesion-anonima';
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'sin-sesion';
  }
}

export const TIPOS_EVENTO = {
  VER_CARTA: 'ver_carta',
  VER_DETALLE: 'ver_detalle',
  AGREGAR: 'agregar',
  ENVIAR: 'enviar',
};

/** POST /api/eventos -> registra una interacción del comensal con la carta. */
export function registrarEvento(tipo, { mesaId = null, productoId = null } = {}) {
  const eventos = leer(COLECCIONES.EVENTOS);
  const sesion = sesionAnonima();
  // Evita duplicar el mismo evento si se dispara dos veces seguidas (doble clic, recarga del efecto)
  const ultimo = eventos.at(-1);
  if (
    ultimo &&
    ultimo.sesion_id === sesion &&
    ultimo.tipo === tipo &&
    ultimo.producto_id === productoId &&
    Date.now() - new Date(ultimo.fecha).getTime() < 1500
  ) {
    return;
  }
  eventos.push({
    id: siguienteId(eventos),
    sesion_id: sesion,
    mesa_id: mesaId,
    producto_id: productoId,
    tipo,
    fecha: new Date().toISOString(),
  });
  escribir(COLECCIONES.EVENTOS, eventos);
}

/* ---------------- Cuentas y pedidos ---------------- */

/** Cuenta abierta de la mesa; si no existe, se abre una nueva. */
function cuentaAbiertaDe(mesa, cuentas) {
  let cuenta = cuentas.find((c) => c.mesa_id === mesa.id && c.estado === 'abierta');
  if (!cuenta) {
    cuenta = {
      id: siguienteId(cuentas, 500),
      mesa_id: mesa.id,
      mesa_numero: mesa.numero,
      garzon_id: null,
      estado: 'abierta',
      total: 0,
      abierta_en: new Date().toISOString(),
      cerrada_en: null,
    };
    cuentas.push(cuenta);
  }
  return cuenta;
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
  const vigentes = productosVigentes();

  const detalle = items.map((item) => {
    const producto = vigentes.find((p) => p.id === item.producto_id);
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

  const cuentas = leer(COLECCIONES.CUENTAS);
  const cuenta = cuentaAbiertaDe(mesa, cuentas);
  const pedidos = leer(COLECCIONES.PEDIDOS);
  const ahora = new Date().toISOString();

  const pedido = {
    id: siguienteId(pedidos, 1000),
    cuenta_id: cuenta.id,
    mesa_id: mesa.id,
    mesa_numero: mesa.numero,
    token_mesa: tokenMesa,
    estado: ESTADOS_PEDIDO.SOLICITADO,
    creado_en: ahora,
    recibido_en: null,
    detalle,
    total: detalle.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0),
  };
  cuenta.total += pedido.total;

  const historial = leer(COLECCIONES.HISTORIAL);
  historial.push({ id: siguienteId(historial), pedido_id: pedido.id, usuario_id: null, estado: pedido.estado, fecha: ahora });

  escribir(COLECCIONES.CUENTAS, cuentas);
  escribir(COLECCIONES.HISTORIAL, historial);
  escribir(COLECCIONES.PEDIDOS, [...pedidos, pedido]);
  detalle.forEach((d) => registrarEvento(TIPOS_EVENTO.ENVIAR, { mesaId: mesa.id, productoId: d.producto_id }));
  return pedido;
}

/** GET /api/pedidos/:id */
export async function getPedido(id) {
  await esperar(150);
  const pedido = leer(COLECCIONES.PEDIDOS).find((p) => p.id === Number(id));
  if (!pedido) {
    const error = new Error('Pedido no encontrado');
    error.status = 404;
    throw error;
  }
  return pedido;
}

/** GET /api/mesas/:token/pedidos -> pedidos de la cuenta abierta de la mesa */
export async function getPedidosDeMesa(tokenMesa) {
  await esperar(150);
  const mesa = mesas.find((m) => m.token_qr === tokenMesa);
  const cuenta = leer(COLECCIONES.CUENTAS).find((c) => c.mesa_id === mesa?.id && c.estado === 'abierta');
  if (!cuenta) return [];
  return leer(COLECCIONES.PEDIDOS)
    .filter((p) => p.cuenta_id === cuenta.id)
    .sort((a, b) => b.id - a.id);
}
