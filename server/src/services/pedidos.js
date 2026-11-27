import { query, transaccion } from '../db/pool.js';
import { avisarCambioPedidos } from '../sockets/index.js';

/** Error con código HTTP, para que el manejador central responda con ese estado. */
export function errorHttp(status, mensaje, campo) {
  const error = new Error(mensaje);
  error.status = status;
  // Campo del formulario al que se refiere el error (el front lo muestra junto a ese campo)
  if (campo) error.campo = campo;
  return error;
}

/**
 * Consulta base de un pedido con la misma forma que usa el front:
 * { id, cuenta_id, mesa_id, mesa_numero, token_mesa, estado, creado_en,
 *   recibido_en, garzon_id, total, detalle: [{ producto_id, nombre, cantidad, precio_unitario, opcion, nota }] }
 * recibido_en y garzon_id salen del historial de estados.
 */
export const SELECT_PEDIDO = `
  SELECT p.id, p.cuenta_id, c.mesa_id, m.numero AS mesa_numero, m.token_qr AS token_mesa,
         p.estado, p.creado_en, h.fecha AS recibido_en, h.usuario_id AS garzon_id,
         SUM(d.cantidad * d.precio_unitario)::int AS total,
         json_agg(json_build_object(
           'producto_id', d.producto_id, 'nombre', pr.nombre, 'cantidad', d.cantidad,
           'precio_unitario', d.precio_unitario, 'opcion', d.opcion, 'nota', d.nota
         ) ORDER BY d.id) AS detalle
  FROM pedido p
  JOIN cuenta c ON c.id = p.cuenta_id
  JOIN mesa m ON m.id = c.mesa_id
  JOIN detalle_pedido d ON d.pedido_id = p.id
  JOIN producto pr ON pr.id = d.producto_id
  LEFT JOIN historial_estado_pedido h ON h.pedido_id = p.id AND h.estado = 'recibido'
`;
export const GROUP_PEDIDO = 'GROUP BY p.id, c.mesa_id, m.numero, m.token_qr, h.fecha, h.usuario_id';

async function mesaActivaPorToken(db, token) {
  const { rows } = await db.query('SELECT id, numero, token_qr, activa FROM mesa WHERE token_qr = $1 AND activa', [token]);
  if (!rows[0]) throw errorHttp(404, 'Mesa no encontrada');
  return rows[0];
}

export const getMesaPorToken = (token) => mesaActivaPorToken({ query }, token);

/** Carta para el comensal: solo productos vigentes y sin el costo. */
export async function getCarta() {
  const { rows: categorias } = await query('SELECT id, nombre, orden, icono FROM categoria ORDER BY orden');
  const { rows: productos } = await query(
    `SELECT id, categoria_id, nombre, descripcion, precio, imagen_url, disponible, destacado, opcion_titulo, opciones
     FROM producto WHERE activo ORDER BY id`
  );
  return categorias
    .map((c) => ({ ...c, productos: productos.filter((p) => p.categoria_id === c.id) }))
    .filter((c) => c.productos.length > 0);
}

/**
 * Opción obligatoria de un producto (marca de la bebida, sabor del jugo).
 * Debe ser una de las que ofrece la carta; si el producto no tiene opciones, se ignora.
 */
function opcionElegida(producto, opcion) {
  if (!producto.opciones?.length) return '';
  const elegida = producto.opciones.find((o) => o === String(opcion ?? '').trim());
  if (!elegida) {
    const titulo = (producto.opcion_titulo || 'opción').toLowerCase();
    throw errorHttp(400, `Elige ${titulo.endsWith('a') ? 'la' : 'el'} ${titulo} de ${producto.nombre}`);
  }
  return elegida;
}

/**
 * Crea un pedido para la mesa del token. Los precios se leen de la base de datos:
 * nunca se confía en el precio que envía el navegador.
 */
export async function crearPedido({ tokenMesa, items }) {
  if (!Array.isArray(items) || items.length === 0) throw errorHttp(400, 'El pedido está vacío');
  if (items.length > 40) throw errorHttp(400, 'El pedido tiene demasiados productos');

  const pedidoId = await transaccion(async (db) => {
    const mesa = await mesaActivaPorToken(db, tokenMesa);

    const ids = items.map((i) => Number(i.producto_id));
    const { rows: productos } = await db.query(
      'SELECT id, nombre, precio, disponible, activo, opcion_titulo, opciones FROM producto WHERE id = ANY($1::int[])',
      [ids]
    );
    const lineas = items.map((item) => {
      const producto = productos.find((p) => p.id === Number(item.producto_id));
      const cantidad = Number(item.cantidad);
      if (!producto || !producto.activo || !producto.disponible) {
        throw errorHttp(409, `${producto?.nombre ?? 'Un producto'} ya no está disponible`);
      }
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) throw errorHttp(400, 'Cantidad no válida');
      return { producto, cantidad, opcion: opcionElegida(producto, item.opcion), nota: String(item.nota ?? '').trim().slice(0, 140) };
    });
    const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);

    // Cuenta abierta de la mesa (si no hay, se abre). El índice único evita dos cuentas abiertas.
    const { rows: cuentas } = await db.query(
      `INSERT INTO cuenta (mesa_id) VALUES ($1)
       ON CONFLICT (mesa_id) WHERE estado = 'abierta' DO UPDATE SET total = cuenta.total
       RETURNING id`,
      [mesa.id]
    );
    const cuentaId = cuentas[0].id;
    await db.query('UPDATE cuenta SET total = total + $1 WHERE id = $2', [total, cuentaId]);

    const { rows } = await db.query('INSERT INTO pedido (cuenta_id) VALUES ($1) RETURNING id', [cuentaId]);
    const id = rows[0].id;
    for (const l of lineas) {
      await db.query(
        'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, opcion, nota) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, l.producto.id, l.cantidad, l.producto.precio, l.opcion, l.nota]
      );
    }
    await db.query(`INSERT INTO historial_estado_pedido (pedido_id, estado) VALUES ($1, 'solicitado')`, [id]);
    return id;
  });

  const pedido = await getPedido(pedidoId);
  avisarCambioPedidos(pedido.mesa_id);
  return pedido;
}

export async function getPedido(id) {
  const { rows } = await query(`${SELECT_PEDIDO} WHERE p.id = $1 ${GROUP_PEDIDO}`, [id]);
  if (!rows[0]) throw errorHttp(404, 'Pedido no encontrado');
  return rows[0];
}

/** Pedido visto por el comensal: solo si pertenece a la mesa de su QR. */
export async function getPedidoDeMesa(id, tokenMesa) {
  const pedido = await getPedido(id);
  if (pedido.token_mesa !== tokenMesa) throw errorHttp(404, 'Pedido no encontrado');
  return pedido;
}

/** Pedidos de la cuenta abierta de la mesa, del más nuevo al más antiguo. */
export async function getPedidosDeMesa(tokenMesa) {
  const { rows } = await query(
    `${SELECT_PEDIDO} WHERE m.token_qr = $1 AND c.estado = 'abierta' ${GROUP_PEDIDO} ORDER BY p.id DESC`,
    [tokenMesa]
  );
  return rows;
}

/** Pedidos solicitados para la cocina y el garzón, los más antiguos primero. */
export async function getPedidosSolicitados() {
  const { rows } = await query(`${SELECT_PEDIDO} WHERE p.estado = 'solicitado' ${GROUP_PEDIDO} ORDER BY p.creado_en`);
  return rows;
}

/** El garzón entrega el pedido y lo marca como recibido (RF07). */
export async function marcarRecibido(id, usuario) {
  const actualizado = await transaccion(async (db) => {
    const { rows } = await db.query(
      `UPDATE pedido SET estado = 'recibido' WHERE id = $1 AND estado = 'solicitado' RETURNING id`,
      [id]
    );
    if (!rows[0]) return false; // ya estaba recibido o no existe
    await db.query(`INSERT INTO historial_estado_pedido (pedido_id, usuario_id, estado) VALUES ($1, $2, 'recibido')`, [
      id,
      usuario.id,
    ]);
    return true;
  });
  const pedido = await getPedido(id);
  if (actualizado) avisarCambioPedidos(pedido.mesa_id);
  return pedido;
}

/** Cada mesa con su cuenta abierta, sus pedidos y cuántos faltan por entregar. */
export async function getMesasConCuenta() {
  const { rows: mesas } = await query('SELECT id, numero, token_qr, activa FROM mesa ORDER BY numero');
  const { rows: cuentas } = await query(`SELECT * FROM cuenta WHERE estado = 'abierta'`);
  const { rows: pedidos } = await query(`${SELECT_PEDIDO} WHERE c.estado = 'abierta' ${GROUP_PEDIDO} ORDER BY p.id`);
  return mesas.map((mesa) => {
    const cuenta = cuentas.find((c) => c.mesa_id === mesa.id) ?? null;
    const suyos = cuenta ? pedidos.filter((p) => p.cuenta_id === cuenta.id) : [];
    return {
      ...mesa,
      cuenta: cuenta && { ...cuenta, mesa_numero: mesa.numero },
      pedidos: suyos,
      porEntregar: suyos.filter((p) => p.estado === 'solicitado').length,
    };
  });
}

/** Registra el pago presencial y cierra la cuenta (RF08). */
export async function cerrarCuenta(cuentaId, usuario) {
  const cuenta = await transaccion(async (db) => {
    const { rows: pendientes } = await db.query(
      `SELECT 1 FROM pedido WHERE cuenta_id = $1 AND estado = 'solicitado' LIMIT 1`,
      [cuentaId]
    );
    if (pendientes[0]) throw errorHttp(409, 'Hay pedidos sin entregar en esta mesa');
    const { rows } = await db.query(
      `UPDATE cuenta SET estado = 'cerrada', cerrada_en = now(), garzon_id = $2
       WHERE id = $1 AND estado = 'abierta' RETURNING *`,
      [cuentaId, usuario.id]
    );
    if (!rows[0]) throw errorHttp(409, 'La cuenta ya fue cerrada');
    return rows[0];
  });
  avisarCambioPedidos(cuenta.mesa_id);
  return cuenta;
}

const TIPOS_EVENTO = ['ver_carta', 'ver_detalle', 'agregar', 'enviar'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evento anónimo de navegación (RF12). Los datos inválidos se ignoran sin error. */
export async function registrarEvento({ sesionId, tipo, mesaId, productoId }) {
  if (!UUID.test(String(sesionId)) || !TIPOS_EVENTO.includes(tipo)) return;
  await query(
    `INSERT INTO evento_navegacion (sesion_id, mesa_id, producto_id, tipo)
     SELECT $1, (SELECT id FROM mesa WHERE id = $2), (SELECT id FROM producto WHERE id = $3), $4`,
    [sesionId, mesaId ?? null, productoId ?? null, tipo]
  );
}
