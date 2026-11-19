/**
 * Capa de acceso a datos del personal: garzón, cocina y administración.
 *
 * Igual que api.js, con servidor (MODO_API) llama a la API REST protegida con JWT:
 *   POST  /api/auth/login
 *   GET   /api/pedidos?estado=solicitado
 *   PATCH /api/pedidos/:id            { estado: 'recibido' }
 *   GET   /api/mesas-estado
 *   POST  /api/cuentas/:id/cerrar
 * y sin servidor trabaja sobre store.js (demo).
 * La administración del catálogo (RF09 y RF10) y el dashboard aún usan los datos simulados.
 */

import { mesas as mesasIniciales, productos as productosIniciales } from '../data/mockData';
import { mesasActuales, productosActuales, usuariosActuales, usuariosConClave } from './catalogo';
import { ESTADOS_PEDIDO } from '../utils/pedido';
import { COLECCIONES, leer, escribir, siguienteId, reiniciar, reiniciarOperacion } from './store';
import { esperar } from './api';
import { http, MODO_API } from './http';

export { suscribir } from './tiempoReal';

export const ROLES = {
  ADMIN: 'administrador',
  GARZON: 'garzon',
  COCINA: 'cocina',
};

export const NOMBRE_ROL = {
  [ROLES.ADMIN]: 'Administración',
  [ROLES.GARZON]: 'Garzón',
  [ROLES.COCINA]: 'Cocina',
};

/** Ruta de inicio de cada rol después de iniciar sesión. */
export const INICIO_ROL = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.GARZON]: '/garzon',
  [ROLES.COCINA]: '/cocina',
};

/* ---------------- Sesión ---------------- */

// La sesión vive en sessionStorage: cada pestaña puede tener un rol distinto
// (por ejemplo, cocina en una y garzón en otra durante la demostración).
const SESION_KEY = 'el10:sesion-personal';

export function getSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(SESION_KEY));
  } catch {
    return null;
  }
}

/** POST /api/auth/login -> { token, usuario }. El backend real compara con bcrypt y firma un JWT. */
export async function login(correo, password) {
  if (MODO_API) {
    const sesion = await http('/auth/login', { method: 'POST', body: { correo, password } });
    try {
      sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
    } catch {
      /* sesión solo en memoria */
    }
    return sesion;
  }
  await esperar(500);
  const encontrado = usuariosConClave().find((u) => u.correo === correo.trim().toLowerCase() && u.activo);
  if (!encontrado || password !== encontrado.clave) {
    // Mensaje genérico: no revela cuál de los dos datos falló
    throw new Error('Correo o contraseña incorrectos');
  }
  // eslint-disable-next-line no-unused-vars
  const { clave, ...usuario } = encontrado;
  const sesion = { token: `demo.${usuario.id}.${Date.now()}`, usuario };
  try {
    sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  } catch {
    /* sesión solo en memoria */
  }
  return sesion;
}

export function logout() {
  try {
    sessionStorage.removeItem(SESION_KEY);
  } catch {
    /* nada que borrar */
  }
}

/* ---------------- Cocina y garzón ---------------- */

/** GET /api/pedidos?estado=solicitado -> los más antiguos primero */
export async function getPedidosSolicitados() {
  if (MODO_API) return http('/pedidos?estado=solicitado', { personal: true });
  return leer(COLECCIONES.PEDIDOS)
    .filter((p) => p.estado === ESTADOS_PEDIDO.SOLICITADO)
    .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));
}

/** PATCH /api/pedidos/:id { estado: 'recibido' } -> solo el garzón */
export async function marcarRecibido(pedidoId, usuario) {
  if (MODO_API) {
    return http(`/pedidos/${pedidoId}`, { method: 'PATCH', body: { estado: ESTADOS_PEDIDO.RECIBIDO }, personal: true });
  }
  await esperar(250);
  const pedidos = leer(COLECCIONES.PEDIDOS);
  const pedido = pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error('El pedido no existe');
  if (pedido.estado === ESTADOS_PEDIDO.RECIBIDO) return pedido;

  const ahora = new Date().toISOString();
  pedido.estado = ESTADOS_PEDIDO.RECIBIDO;
  pedido.recibido_en = ahora;
  pedido.garzon_id = usuario.id;

  const historial = leer(COLECCIONES.HISTORIAL);
  historial.push({ id: siguienteId(historial), pedido_id: pedido.id, usuario_id: usuario.id, estado: pedido.estado, fecha: ahora });
  escribir(COLECCIONES.HISTORIAL, historial);
  escribir(COLECCIONES.PEDIDOS, pedidos);
  return pedido;
}

/** GET /api/mesas/estado -> cada mesa con su cuenta abierta (si tiene) */
export async function getMesasConCuenta() {
  if (MODO_API) return http('/mesas-estado', { personal: true });
  const cuentas = leer(COLECCIONES.CUENTAS);
  const pedidos = leer(COLECCIONES.PEDIDOS);
  return mesasActuales().map((mesa) => {
    const cuenta = cuentas.find((c) => c.mesa_id === mesa.id && c.estado === 'abierta') ?? null;
    const suyos = cuenta ? pedidos.filter((p) => p.cuenta_id === cuenta.id).sort((a, b) => a.id - b.id) : [];
    return {
      ...mesa,
      cuenta,
      pedidos: suyos,
      porEntregar: suyos.filter((p) => p.estado === ESTADOS_PEDIDO.SOLICITADO).length,
    };
  });
}

/** POST /api/cuentas/:id/cerrar -> registra el pago presencial y cierra la cuenta */
export async function cerrarCuenta(cuentaId, usuario) {
  if (MODO_API) return http(`/cuentas/${cuentaId}/cerrar`, { method: 'POST', personal: true });
  await esperar(400);
  const cuentas = leer(COLECCIONES.CUENTAS);
  const cuenta = cuentas.find((c) => c.id === cuentaId);
  if (!cuenta || cuenta.estado !== 'abierta') throw new Error('La cuenta ya fue cerrada');
  const pendientes = leer(COLECCIONES.PEDIDOS).filter(
    (p) => p.cuenta_id === cuentaId && p.estado === ESTADOS_PEDIDO.SOLICITADO
  );
  if (pendientes.length) throw new Error('Hay pedidos sin entregar en esta mesa');

  cuenta.estado = 'cerrada';
  cuenta.cerrada_en = new Date().toISOString();
  cuenta.garzon_id = usuario.id;
  escribir(COLECCIONES.CUENTAS, cuentas);
  return cuenta;
}

/* ---------------- Administración (lecturas) ---------------- */

export async function getProductosAdmin() {
  return productosActuales();
}

export async function getUsuarios() {
  return usuariosActuales();
}

/** Mesas con la indicación de si tienen una cuenta abierta (no se pueden desactivar). */
export async function getMesas() {
  const abiertas = new Set(leer(COLECCIONES.CUENTAS).filter((c) => c.estado === 'abierta').map((c) => c.mesa_id));
  return mesasActuales().map((m) => ({ ...m, cuentaAbierta: abiertas.has(m.id) }));
}

/* ---------------- Datos de demostración ---------------- */

/**
 * Crea algunas cuentas abiertas con pedidos solicitados y recibidos,
 * para mostrar la cocina y la vista del garzón con movimiento.
 */
export function cargarPedidosDemo() {
  // Mantiene la carta, las mesas y los usuarios que haya editado el administrador
  reiniciarOperacion();
  const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
  const catalogo = productosActuales();
  const nombre = (id) => catalogo.find((p) => p.id === id) ?? productosIniciales.find((p) => p.id === id);
  const mesas = mesasActuales();
  const linea = (id, cantidad, nota = '') => ({
    producto_id: id,
    nombre: nombre(id).nombre,
    cantidad,
    precio_unitario: nombre(id).precio,
    nota,
  });

  const plan = [
    { mesa: 1, abierta: 48, pedidos: [
      { min: 46, recibido: 31, detalle: [linea(101, 2), linea(501, 2, 'una Coca-Cola Zero')] },
      { min: 14, detalle: [linea(201, 1, 'sin pepinillos'), linea(302, 1)] },
    ] },
    { mesa: 2, abierta: 9, pedidos: [
      { min: 8, detalle: [linea(202, 2, 'una sin cebolla'), linea(503, 2)] },
    ] },
    { mesa: 3, abierta: 62, pedidos: [
      { min: 60, recibido: 44, detalle: [linea(104, 1, 'carne bien cocida'), linea(301, 2)] },
      { min: 39, recibido: 22, detalle: [linea(304, 2)] },
    ] },
    { mesa: 4, abierta: 4, pedidos: [
      { min: 3, detalle: [linea(105, 2, 'una sin mayonesa'), linea(501, 2)] },
    ] },
    { mesa: 5, abierta: 27, pedidos: [
      { min: 25, recibido: 12, detalle: [linea(203, 3), linea(502, 1)] },
      { min: 1, detalle: [linea(401, 2), linea(402, 1, 'manjar aparte')] },
    ] },
  ];

  const cuentas = [];
  const pedidos = [];
  const historial = [];
  plan.forEach((m) => {
    const mesa = mesas.find((x) => x.numero === m.mesa) ?? mesasIniciales.find((x) => x.numero === m.mesa);
    const cuenta = {
      id: 501 + cuentas.length,
      mesa_id: mesa.id,
      mesa_numero: mesa.numero,
      garzon_id: null,
      estado: 'abierta',
      total: 0,
      abierta_en: hace(m.abierta),
      cerrada_en: null,
    };
    cuentas.push(cuenta);
    m.pedidos.forEach((p) => {
      const pedido = {
        id: 1001 + pedidos.length,
        cuenta_id: cuenta.id,
        mesa_id: mesa.id,
        mesa_numero: mesa.numero,
        token_mesa: mesa.token_qr,
        estado: p.recibido ? ESTADOS_PEDIDO.RECIBIDO : ESTADOS_PEDIDO.SOLICITADO,
        creado_en: hace(p.min),
        recibido_en: p.recibido ? hace(p.recibido) : null,
        garzon_id: p.recibido ? 1 : null,
        detalle: p.detalle,
        total: p.detalle.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0),
      };
      cuenta.total += pedido.total;
      pedidos.push(pedido);
      historial.push({ id: historial.length + 1, pedido_id: pedido.id, usuario_id: null, estado: 'solicitado', fecha: pedido.creado_en });
      if (p.recibido) historial.push({ id: historial.length + 1, pedido_id: pedido.id, usuario_id: 1, estado: 'recibido', fecha: pedido.recibido_en });
    });
  });
  // pedidos ordenados por hora de creación (ids correlativos)
  pedidos.sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en)).forEach((p, i) => {
    const nuevo = 1001 + i;
    historial.filter((h) => h.pedido_id === p.id).forEach((h) => (h.pedido_id = -nuevo));
    p.id = nuevo;
  });
  historial.forEach((h) => (h.pedido_id = Math.abs(h.pedido_id)));

  escribir(COLECCIONES.CUENTAS, cuentas);
  escribir(COLECCIONES.HISTORIAL, historial);
  escribir(COLECCIONES.PEDIDOS, pedidos);
}

export { reiniciar as reiniciarDemo };
