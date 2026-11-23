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
 * La administración (carta, mesas, usuarios) está en catalogo.js y el dashboard en biApi.js.
 */

import { mesasActuales, usuariosConClave } from './catalogo';
import { ESTADOS_PEDIDO } from '../utils/pedido';
import { COLECCIONES, leer, escribir, siguienteId, reiniciar } from './store';
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

/* ---------------- Demo sin servidor ---------------- */

export { reiniciar as reiniciarDemo };
