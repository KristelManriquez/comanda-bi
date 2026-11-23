/**
 * Capa de acceso a datos del comensal.
 *
 * Funciona de dos formas (ver http.js):
 *  - Con servidor (MODO_API): cada función llama a la API REST, que guarda
 *    los pedidos en PostgreSQL.
 *  - Demo: datos simulados (datosIniciales) guardados en localStorage (store.js).
 *
 * Los componentes no cambian, porque solo conocen estas funciones.
 */

import { restaurante } from '../data/datosIniciales';
import { categoriasActuales, mesasActuales, productosActuales } from './catalogo';
import { ESTADOS_PEDIDO } from '../utils/pedido';
import { COLECCIONES, leer, escribir, siguienteId } from './store';

import { http, MODO_API } from './http';

export { suscribir } from './tiempoReal';

// Simula la latencia de red para poder ver los estados de carga.
export const esperar = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/** Productos que están en la carta (los retirados por el administrador no se muestran). */
export function productosVigentes() {
  return productosActuales().filter((p) => p.activo !== false);
}

/** GET /api/mesas/:token -> valida el token del QR */
export async function getMesaPorToken(token) {
  if (MODO_API) return http(`/mesas/${encodeURIComponent(token)}`);
  await esperar(200);
  const mesa = mesasActuales().find((m) => m.token_qr === token && m.activa);
  if (!mesa) {
    const error = new Error('Mesa no encontrada');
    error.status = 404;
    throw error;
  }
  return mesa;
}

/** GET /api/carta -> restaurante + categorías con sus productos (sin costo) */
export async function getCarta() {
  if (MODO_API) {
    const { categorias } = await http('/carta');
    return { restaurante, categorias };
  }
  await esperar();
  const vigentes = productosVigentes();
  return {
    restaurante,
    categorias: categoriasActuales()
      .map((c) => ({
        ...c,
        // eslint-disable-next-line no-unused-vars
        productos: vigentes.filter((p) => p.categoria_id === c.id).map(({ costo, ...p }) => p),
      }))
      // Una categoría sin productos no se muestra al comensal
      .filter((c) => c.productos.length > 0),
  };
}

/* ---------------- Eventos de navegación (anónimos) ---------------- */

/**
 * Identificador de sesión anónimo y aleatorio, distinto en cada pestaña.
 * No se asocia a ningún dato personal del comensal (Ley N.° 21.719).
 */
function sesionAnonima() {
  const KEY = 'el10:sesion-anonima';
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
let ultimoEnviado = null;

export function registrarEvento(tipo, { mesaId = null, productoId = null } = {}) {
  if (MODO_API) {
    const sesion = sesionAnonima();
    const clave = `${tipo}:${productoId}`;
    // Evita duplicar el mismo evento si se dispara dos veces seguidas
    if (ultimoEnviado?.clave === clave && Date.now() - ultimoEnviado.en < 1500) return;
    ultimoEnviado = { clave, en: Date.now() };
    // No se espera la respuesta: un evento perdido no debe afectar al comensal
    http('/eventos', {
      method: 'POST',
      body: { sesion_id: sesion, tipo, mesa_id: mesaId, producto_id: productoId },
    }).catch(() => {});
    return;
  }
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
  if (MODO_API) {
    const pedido = await http('/pedidos', {
      method: 'POST',
      body: {
        token_mesa: tokenMesa,
        items: items.map(({ producto_id, cantidad, nota }) => ({ producto_id, cantidad, nota })),
      },
    });
    pedido.detalle.forEach((d) => registrarEvento(TIPOS_EVENTO.ENVIAR, { mesaId: pedido.mesa_id, productoId: d.producto_id }));
    return pedido;
  }
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

/** GET /api/mesas/:token/pedidos/:id -> solo si el pedido es de esa mesa */
export async function getPedido(id, tokenMesa) {
  if (MODO_API) return http(`/mesas/${encodeURIComponent(tokenMesa)}/pedidos/${Number(id)}`);
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
  if (MODO_API) return http(`/mesas/${encodeURIComponent(tokenMesa)}/pedidos`);
  await esperar(150);
  const mesa = mesasActuales().find((m) => m.token_qr === tokenMesa);
  const cuenta = leer(COLECCIONES.CUENTAS).find((c) => c.mesa_id === mesa?.id && c.estado === 'abierta');
  if (!cuenta) return [];
  return leer(COLECCIONES.PEDIDOS)
    .filter((p) => p.cuenta_id === cuenta.id)
    .sort((a, b) => b.id - a.id);
}
