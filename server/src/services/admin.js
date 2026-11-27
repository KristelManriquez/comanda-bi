import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, transaccion } from '../db/pool.js';
import { avisarCambioGeneral } from '../sockets/index.js';
import { errorHttp, SELECT_PEDIDO, GROUP_PEDIDO } from './pedidos.js';

/**
 * Administración de El 10 (RF09 y RF10) y datos del dashboard (RF11 y RF12).
 * Todas estas funciones se llaman desde rutas que exigen el rol administrador.
 * Después de cada cambio se avisa por Socket.IO a todas las pantallas, para
 * que la carta de las mesas y las vistas del personal se actualicen solas.
 */

const texto = (v) => String(v ?? '').trim();
const ROLES = ['administrador', 'garzon', 'cocina'];
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------- Categorías ---------------- */

export async function getCategorias() {
  const { rows } = await query('SELECT id, nombre, orden, icono FROM categoria ORDER BY orden, id');
  return rows;
}

export async function guardarCategoria(id, datos) {
  const nombre = texto(datos?.nombre);
  if (!nombre) throw errorHttp(400, 'Escribe el nombre de la categoría', 'nombre');
  if (nombre.length > 40) throw errorHttp(400, 'El nombre puede tener hasta 40 caracteres', 'nombre');
  const { rows: repetidas } = await query(
    'SELECT 1 FROM categoria WHERE lower(nombre) = lower($1) AND id IS DISTINCT FROM $2',
    [nombre, id ?? null]
  );
  if (repetidas[0]) throw errorHttp(409, 'Ya existe una categoría con ese nombre', 'nombre');

  let categoria;
  if (id) {
    const { rows } = await query('UPDATE categoria SET nombre = $1 WHERE id = $2 RETURNING *', [nombre, id]);
    if (!rows[0]) throw errorHttp(404, 'La categoría no existe');
    categoria = rows[0];
  } else {
    const { rows } = await query(
      `INSERT INTO categoria (nombre, orden, icono)
       VALUES ($1, (SELECT COALESCE(MAX(orden), 0) + 1 FROM categoria), 'plato') RETURNING *`,
      [nombre]
    );
    categoria = rows[0];
  }
  avisarCambioGeneral();
  return categoria;
}

/** Mueve una categoría una posición arriba (-1) o abajo (+1) en la carta. */
export async function moverCategoria(id, direccion) {
  if (direccion !== -1 && direccion !== 1) throw errorHttp(400, 'Dirección no válida');
  await transaccion(async (db) => {
    const { rows } = await db.query('SELECT id FROM categoria ORDER BY orden, id FOR UPDATE');
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (let k = 0; k < ids.length; k++) {
      await db.query('UPDATE categoria SET orden = $1 WHERE id = $2', [k + 1, ids[k]]);
    }
  });
  avisarCambioGeneral();
}

export async function eliminarCategoria(id) {
  const { rows } = await query('SELECT 1 FROM producto WHERE categoria_id = $1 AND activo LIMIT 1', [id]);
  if (rows[0]) throw errorHttp(409, 'La categoría tiene productos. Muévelos o retíralos antes de eliminarla.');
  await query('DELETE FROM categoria WHERE id = $1', [id]);
  avisarCambioGeneral();
}

/* ---------------- Productos ---------------- */

/** Todos los productos, con su costo e incluidos los retirados de la carta. */
export async function getProductos() {
  const { rows } = await query(
    `SELECT id, categoria_id, nombre, descripcion, precio, costo, imagen_url, disponible, destacado, activo,
            opcion_titulo, opciones
     FROM producto ORDER BY categoria_id NULLS LAST, id`
  );
  return rows;
}

function validarProducto(datos) {
  const nombre = texto(datos?.nombre);
  const precio = Number(datos?.precio);
  const costo = Number(datos?.costo);
  if (!nombre) throw errorHttp(400, 'Escribe el nombre del producto', 'nombre');
  if (nombre.length > 60) throw errorHttp(400, 'El nombre puede tener hasta 60 caracteres', 'nombre');
  if (!datos?.categoria_id) throw errorHttp(400, 'Elige una categoría', 'categoria_id');
  if (!Number.isInteger(precio) || precio <= 0) throw errorHttp(400, 'El precio debe ser un número entero mayor que cero', 'precio');
  if (!Number.isInteger(costo) || costo < 0) throw errorHttp(400, 'El costo debe ser un número entero, cero o mayor', 'costo');
  if (costo >= precio) throw errorHttp(400, 'El costo debe ser menor que el precio', 'costo');
  const { opcion_titulo, opciones } = validarOpciones(datos?.opcion_titulo, datos?.opciones);
  return {
    nombre,
    descripcion: texto(datos.descripcion).slice(0, 160),
    categoria_id: Number(datos.categoria_id),
    precio,
    costo,
    disponible: datos.disponible !== false,
    destacado: Boolean(datos.destacado),
    opcion_titulo,
    opciones,
  };
}

/**
 * Opción obligatoria del producto: un título ("Marca", "Sabor") y entre 2 y 10
 * opciones. Ambos vacíos = el producto se pide sin elegir nada.
 */
function validarOpciones(titulo, opciones) {
  const t = texto(titulo);
  const lista = (Array.isArray(opciones) ? opciones : String(opciones ?? '').split(','))
    .map((o) => texto(o))
    .filter(Boolean);
  if (!t && lista.length === 0) return { opcion_titulo: '', opciones: [] };
  if (!t) throw errorHttp(400, 'Escribe qué debe elegir el comensal (por ejemplo, Marca o Sabor)', 'opcion_titulo');
  if (t.length > 30) throw errorHttp(400, 'El título puede tener hasta 30 caracteres', 'opcion_titulo');
  if (lista.length < 2) throw errorHttp(400, 'Escribe al menos dos opciones, separadas por coma', 'opciones');
  if (lista.length > 10) throw errorHttp(400, 'Puedes escribir hasta 10 opciones', 'opciones');
  if (lista.some((o) => o.length > 30)) throw errorHttp(400, 'Cada opción puede tener hasta 30 caracteres', 'opciones');
  if (new Set(lista.map((o) => o.toLowerCase())).size !== lista.length) throw errorHttp(400, 'Hay opciones repetidas', 'opciones');
  return { opcion_titulo: t, opciones: lista };
}

export async function guardarProducto(id, datos) {
  const p = validarProducto(datos);
  const { rows: categoria } = await query('SELECT 1 FROM categoria WHERE id = $1', [p.categoria_id]);
  if (!categoria[0]) throw errorHttp(400, 'La categoría no existe', 'categoria_id');
  const { rows: repetidos } = await query(
    'SELECT 1 FROM producto WHERE activo AND lower(nombre) = lower($1) AND id IS DISTINCT FROM $2',
    [p.nombre, id ?? null]
  );
  if (repetidos[0]) throw errorHttp(409, 'Ya existe un producto con ese nombre en la carta', 'nombre');

  const valores = [p.categoria_id, p.nombre, p.descripcion, p.precio, p.costo, p.disponible, p.destacado, p.opcion_titulo, p.opciones];
  let producto;
  if (id) {
    const { rows } = await query(
      `UPDATE producto SET categoria_id = $1, nombre = $2, descripcion = $3, precio = $4, costo = $5,
         disponible = $6, destacado = $7, opcion_titulo = $8, opciones = $9
       WHERE id = $10 RETURNING *`,
      [...valores, id]
    );
    if (!rows[0]) throw errorHttp(404, 'El producto no existe');
    producto = rows[0];
  } else {
    const { rows } = await query(
      `INSERT INTO producto (categoria_id, nombre, descripcion, precio, costo, disponible, destacado, opcion_titulo, opciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      valores
    );
    producto = rows[0];
  }
  avisarCambioGeneral();
  return producto;
}

/**
 * Cambia la disponibilidad (agotado o no) o retira / reincorpora un producto.
 * Los productos no se borran: sus ventas pasadas siguen en detalle_pedido y en el dashboard.
 */
export async function cambiarEstadoProducto(id, { disponible, activo } = {}) {
  const sets = [];
  const valores = [];
  if (typeof disponible === 'boolean') sets.push(`disponible = $${valores.push(disponible)}`);
  if (typeof activo === 'boolean') sets.push(`activo = $${valores.push(activo)}`);
  if (!sets.length) throw errorHttp(400, 'No hay cambios');
  valores.push(id);
  const { rows } = await query(`UPDATE producto SET ${sets.join(', ')} WHERE id = $${valores.length} RETURNING *`, valores);
  if (!rows[0]) throw errorHttp(404, 'El producto no existe');
  avisarCambioGeneral();
  return rows[0];
}

/* ---------------- Mesas ---------------- */

/** Token aleatorio para el QR: no se puede adivinar la dirección de otra mesa. */
const tokenQr = (numero) => `m${numero}-${randomBytes(3).toString('hex')}`;

/** Mesas con la indicación de si tienen una cuenta abierta (no se pueden desactivar). */
export async function getMesas() {
  const { rows } = await query(
    `SELECT m.id, m.numero, m.token_qr, m.activa,
            EXISTS (SELECT 1 FROM cuenta c WHERE c.mesa_id = m.id AND c.estado = 'abierta') AS "cuentaAbierta"
     FROM mesa m ORDER BY m.numero`
  );
  return rows;
}

export async function crearMesa() {
  const mesa = await transaccion(async (db) => {
    await db.query('LOCK TABLE mesa IN EXCLUSIVE MODE');
    const { rows: max } = await db.query('SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM mesa');
    const numero = max[0].numero;
    const { rows } = await db.query('INSERT INTO mesa (numero, token_qr) VALUES ($1, $2) RETURNING *', [numero, tokenQr(numero)]);
    return rows[0];
  });
  avisarCambioGeneral();
  return mesa;
}

export async function setActivaMesa(id, activa) {
  if (typeof activa !== 'boolean') throw errorHttp(400, 'Estado no válido');
  if (!activa) {
    const { rows } = await query(`SELECT 1 FROM cuenta WHERE mesa_id = $1 AND estado = 'abierta'`, [id]);
    if (rows[0]) throw errorHttp(409, 'La mesa tiene una cuenta abierta. Ciérrala antes de desactivarla.');
  }
  const { rows } = await query('UPDATE mesa SET activa = $1 WHERE id = $2 RETURNING *', [activa, id]);
  if (!rows[0]) throw errorHttp(404, 'La mesa no existe');
  avisarCambioGeneral();
  return rows[0];
}

/** Genera un QR nuevo: el código impreso anterior deja de funcionar. */
export async function regenerarQr(id) {
  const { rows: actual } = await query('SELECT numero FROM mesa WHERE id = $1', [id]);
  if (!actual[0]) throw errorHttp(404, 'La mesa no existe');
  const { rows } = await query('UPDATE mesa SET token_qr = $1 WHERE id = $2 RETURNING *', [tokenQr(actual[0].numero), id]);
  avisarCambioGeneral();
  return rows[0];
}

/* ---------------- Usuarios ---------------- */

export async function getUsuarios() {
  const { rows } = await query('SELECT id, nombre, correo, rol, activo FROM usuario ORDER BY id');
  return rows;
}

/** Crea o edita un usuario. La contraseña se guarda solo como hash bcrypt. */
export async function guardarUsuario(id, datos, actual) {
  const nombre = texto(datos?.nombre);
  const correo = texto(datos?.correo).toLowerCase();
  const clave = String(datos?.clave ?? '');
  const rol = datos?.rol;
  const activo = datos?.activo !== false;
  if (!nombre) throw errorHttp(400, 'Escribe el nombre', 'nombre');
  if (nombre.length > 60) throw errorHttp(400, 'El nombre puede tener hasta 60 caracteres', 'nombre');
  if (!CORREO.test(correo)) throw errorHttp(400, 'Escribe un correo válido', 'correo');
  if (!ROLES.includes(rol)) throw errorHttp(400, 'Elige un rol', 'rol');
  if ((!id || clave) && clave.length < 8) throw errorHttp(400, 'La contraseña debe tener al menos 8 caracteres', 'clave');
  if (id && id === actual.id && (!activo || rol !== 'administrador')) {
    throw errorHttp(409, 'No puedes quitarte el rol de administración ni desactivar tu propia cuenta');
  }
  const { rows: repetido } = await query('SELECT 1 FROM usuario WHERE correo = $1 AND id IS DISTINCT FROM $2', [correo, id ?? null]);
  if (repetido[0]) throw errorHttp(409, 'Ese correo ya está registrado', 'correo');

  const hash = clave ? await bcrypt.hash(clave, 10) : null;
  let usuario;
  if (id) {
    const { rows } = await query(
      `UPDATE usuario SET nombre = $1, correo = $2, rol = $3, activo = $4,
         contrasena_hash = COALESCE($5, contrasena_hash)
       WHERE id = $6 RETURNING id, nombre, correo, rol, activo`,
      [nombre, correo, rol, activo, hash, id]
    );
    if (!rows[0]) throw errorHttp(404, 'El usuario no existe');
    usuario = rows[0];
  } else {
    const { rows } = await query(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, rol, activo)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, correo, rol, activo`,
      [nombre, correo, hash, rol, activo]
    );
    usuario = rows[0];
  }
  avisarCambioGeneral();
  return usuario;
}

/* ---------------- Dashboard ---------------- */

function fecha(valor, campo) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) throw errorHttp(400, `Fecha no válida: ${campo}`);
  return d;
}

/**
 * Datos de origen del dashboard en un rango [desde, hasta):
 * cuentas cerradas (ventas pagadas), sus pedidos con el detalle, los eventos
 * anónimos de navegación y el catálogo completo (incluidos los productos retirados,
 * para no perder sus ventas). Los indicadores se calculan en el front con estos datos.
 */
export async function getDatosDashboard(desdeTexto, hastaTexto) {
  const desde = fecha(desdeTexto, 'desde');
  const hasta = fecha(hastaTexto, 'hasta');
  if (hasta <= desde) throw errorHttp(400, 'El rango de fechas no es válido');
  if (hasta - desde > 400 * 86400000) throw errorHttp(400, 'El rango puede ser de hasta 400 días');

  const { rows: cuentas } = await query(
    `SELECT id, mesa_id, garzon_id, estado, total, abierta_en, cerrada_en
     FROM cuenta WHERE estado = 'cerrada' AND cerrada_en >= $1 AND cerrada_en < $2 ORDER BY cerrada_en`,
    [desde, hasta]
  );
  const ids = cuentas.map((c) => c.id);
  const { rows: pedidos } = ids.length
    ? await query(`${SELECT_PEDIDO} WHERE p.cuenta_id = ANY($1::int[]) ${GROUP_PEDIDO} ORDER BY p.id`, [ids])
    : { rows: [] };
  const { rows: eventos } = await query(
    `SELECT sesion_id, mesa_id, producto_id, tipo, fecha FROM evento_navegacion
     WHERE fecha >= $1 AND fecha < $2 ORDER BY fecha, id`,
    [desde, hasta]
  );
  return { cuentas, pedidos, eventos, productos: await getProductos(), categorias: await getCategorias() };
}

/** Primera fecha con datos (cuenta cerrada o evento), para limitar el selector de fechas. */
export async function getPrimeraFecha() {
  const { rows } = await query(
    `SELECT LEAST(
       (SELECT MIN(cerrada_en) FROM cuenta WHERE estado = 'cerrada'),
       (SELECT MIN(fecha) FROM evento_navegacion)
     ) AS primera`
  );
  return { primera: rows[0].primera };
}
