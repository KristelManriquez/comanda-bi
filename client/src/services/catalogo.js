/**
 * Catálogo del restaurante: categorías, productos, mesas y usuarios.
 *
 * Parte con los datos iniciales de El 10 (mockData) y guarda en store.js
 * los cambios que hace el administrador, para que se vean al instante en
 * la carta de las mesas, en la vista del garzón y en el dashboard.
 *
 * En el sistema real cada colección es una tabla de PostgreSQL y estas
 * funciones son endpoints REST protegidos con JWT y rol administrador:
 *   GET/POST/PATCH /api/categorias, /api/productos, /api/mesas, /api/usuarios
 */

import * as inicial from '../data/mockData';
import { COLECCIONES, leer, escribir, siguienteId } from './store';

// Copia profunda: los cambios nunca modifican los datos iniciales en memoria
function coleccion(nombre, semilla) {
  return leer(nombre, null) ?? structuredClone(semilla);
}

/* ---------------- Lectura (síncrona, la usan las demás capas) ---------------- */

export function categoriasActuales() {
  return coleccion(COLECCIONES.CATEGORIAS, inicial.categorias).slice().sort((a, b) => a.orden - b.orden);
}

/** Todos los productos, incluidos los retirados de la carta (activo = false). */
export function productosActuales() {
  const lista = coleccion(COLECCIONES.PRODUCTOS, null);
  if (lista) return lista;
  // Migra los cambios de disponibilidad guardados por la versión anterior
  const cambios = leer('disponibilidad', {});
  return inicial.productos.map((p) => ({ ...p, activo: true, ...(p.id in cambios ? { disponible: cambios[p.id] } : {}) }));
}

export function mesasActuales() {
  return coleccion(COLECCIONES.MESAS, inicial.mesas).slice().sort((a, b) => a.numero - b.numero);
}

/** Usuarios con su clave de demostración (en la BD real solo existe el hash bcrypt). */
export function usuariosConClave() {
  return coleccion(COLECCIONES.USUARIOS, inicial.usuarios.map((u) => ({ ...u, clave: inicial.PASSWORD_DEMO })));
}

export function usuariosActuales() {
  // eslint-disable-next-line no-unused-vars
  return usuariosConClave().map(({ clave, ...u }) => u);
}

/* ---------------- Validaciones comunes ---------------- */

const texto = (v) => String(v ?? '').trim();

function error(mensaje, campo) {
  const e = new Error(mensaje);
  e.campo = campo;
  return e;
}

/* ---------------- Categorías ---------------- */

export function guardarCategoria({ id, nombre }) {
  const lista = categoriasActuales();
  const limpio = texto(nombre);
  if (!limpio) throw error('Escribe el nombre de la categoría', 'nombre');
  if (lista.some((c) => c.id !== id && c.nombre.toLowerCase() === limpio.toLowerCase())) {
    throw error('Ya existe una categoría con ese nombre', 'nombre');
  }
  if (id) {
    lista.find((c) => c.id === id).nombre = limpio;
  } else {
    lista.push({ id: siguienteId(lista), nombre: limpio, orden: lista.length + 1, icono: 'plato' });
  }
  escribir(COLECCIONES.CATEGORIAS, lista);
}

/** Mueve una categoría una posición arriba (-1) o abajo (+1) en la carta. */
export function moverCategoria(id, direccion) {
  const lista = categoriasActuales();
  const i = lista.findIndex((c) => c.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  lista.forEach((c, k) => (c.orden = k + 1));
  escribir(COLECCIONES.CATEGORIAS, lista);
}

export function eliminarCategoria(id) {
  if (productosActuales().some((p) => p.categoria_id === id && p.activo !== false)) {
    throw error('La categoría tiene productos. Muévelos o retíralos antes de eliminarla.');
  }
  escribir(COLECCIONES.CATEGORIAS, categoriasActuales().filter((c) => c.id !== id));
}

/* ---------------- Productos ---------------- */

export function guardarProducto(datos) {
  const lista = productosActuales();
  const nombre = texto(datos.nombre);
  const precio = Number(datos.precio);
  const costo = Number(datos.costo);
  if (!nombre) throw error('Escribe el nombre del producto', 'nombre');
  if (!datos.categoria_id) throw error('Elige una categoría', 'categoria_id');
  if (!Number.isInteger(precio) || precio <= 0) throw error('El precio debe ser un número entero mayor que cero', 'precio');
  if (!Number.isInteger(costo) || costo < 0) throw error('El costo debe ser un número entero, cero o mayor', 'costo');
  if (costo >= precio) throw error('El costo debe ser menor que el precio', 'costo');
  if (lista.some((p) => p.id !== datos.id && p.activo !== false && p.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw error('Ya existe un producto con ese nombre en la carta', 'nombre');
  }

  const campos = {
    nombre,
    descripcion: texto(datos.descripcion),
    categoria_id: Number(datos.categoria_id),
    precio,
    costo,
    disponible: Boolean(datos.disponible),
    destacado: Boolean(datos.destacado),
  };
  if (datos.id) {
    Object.assign(lista.find((p) => p.id === datos.id), campos);
  } else {
    const ids = lista.filter((p) => p.categoria_id === campos.categoria_id).map((p) => p.id);
    const id = ids.length ? Math.max(...ids) + 1 : campos.categoria_id * 100 + 1;
    lista.push({ id: lista.some((p) => p.id === id) ? siguienteId(lista, 900) : id, imagen_url: null, activo: true, ...campos });
  }
  escribir(COLECCIONES.PRODUCTOS, lista);
}

export function setDisponibleProducto(id, disponible) {
  const lista = productosActuales();
  lista.find((p) => p.id === id).disponible = disponible;
  escribir(COLECCIONES.PRODUCTOS, lista);
}

/**
 * Retira (o reincorpora) un producto de la carta. No se borra: sus ventas
 * pasadas siguen en detalle_pedido y en el dashboard.
 */
export function setActivoProducto(id, activo) {
  const lista = productosActuales();
  lista.find((p) => p.id === id).activo = activo;
  escribir(COLECCIONES.PRODUCTOS, lista);
}

/* ---------------- Mesas ---------------- */

/** Token aleatorio para el QR: no se puede adivinar la dirección de otra mesa. */
function tokenQr(numero) {
  const azar = crypto.getRandomValues(new Uint8Array(4));
  return `m${numero}-${Array.from(azar, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 6)}`;
}

export function crearMesa() {
  const lista = mesasActuales();
  const numero = lista.reduce((m, x) => Math.max(m, x.numero), 0) + 1;
  lista.push({ id: siguienteId(lista), numero, token_qr: tokenQr(numero), activa: true });
  escribir(COLECCIONES.MESAS, lista);
  return numero;
}

export function setActivaMesa(id, activa, tieneCuentaAbierta) {
  if (!activa && tieneCuentaAbierta) throw error('La mesa tiene una cuenta abierta. Ciérrala antes de desactivarla.');
  const lista = mesasActuales();
  lista.find((m) => m.id === id).activa = activa;
  escribir(COLECCIONES.MESAS, lista);
}

/** Genera un QR nuevo: el código impreso anterior deja de funcionar. */
export function regenerarQr(id) {
  const lista = mesasActuales();
  const mesa = lista.find((m) => m.id === id);
  mesa.token_qr = tokenQr(mesa.numero);
  escribir(COLECCIONES.MESAS, lista);
}

/* ---------------- Usuarios ---------------- */

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function guardarUsuario(datos, idActual) {
  const lista = usuariosConClave();
  const nombre = texto(datos.nombre);
  const correo = texto(datos.correo).toLowerCase();
  const clave = String(datos.clave ?? '');
  if (!nombre) throw error('Escribe el nombre', 'nombre');
  if (!CORREO.test(correo)) throw error('Escribe un correo válido', 'correo');
  if (lista.some((u) => u.id !== datos.id && u.correo === correo)) throw error('Ese correo ya está registrado', 'correo');
  if (!datos.rol) throw error('Elige un rol', 'rol');
  if (!datos.id && clave.length < 8) throw error('La contraseña debe tener al menos 8 caracteres', 'clave');
  if (datos.id && clave && clave.length < 8) throw error('La contraseña debe tener al menos 8 caracteres', 'clave');
  if (datos.id === idActual && (datos.activo === false || datos.rol !== 'administrador')) {
    throw error('No puedes quitarte el rol de administración ni desactivar tu propia cuenta');
  }

  const campos = { nombre, correo, rol: datos.rol, activo: datos.activo !== false };
  if (datos.id) {
    const u = lista.find((x) => x.id === datos.id);
    Object.assign(u, campos);
    if (clave) u.clave = clave;
  } else {
    lista.push({ id: siguienteId(lista), ...campos, clave });
  }
  escribir(COLECCIONES.USUARIOS, lista);
}
