/**
 * Actualiza una base de datos existente sin borrar sus datos.
 * Uso: npm run db:migrar
 *
 * Agrega la opción obligatoria de los productos (marca de la bebida, sabor del
 * jugo) y la opción elegida en cada línea del pedido. Se puede ejecutar varias
 * veces: solo cambia lo que falta.
 */
import '../env.js';
import { pool } from './pool.js';
import { productos } from '../../../client/src/data/datosIniciales.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`ALTER TABLE producto ADD COLUMN IF NOT EXISTS opcion_titulo VARCHAR(30) NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE producto ADD COLUMN IF NOT EXISTS opciones TEXT[] NOT NULL DEFAULT '{}'`);
  await client.query(`ALTER TABLE detalle_pedido ADD COLUMN IF NOT EXISTS opcion VARCHAR(30) NOT NULL DEFAULT ''`);

  // Opciones de la carta inicial de El 10, solo en productos que aún no tienen
  let actualizados = 0;
  for (const p of productos.filter((x) => x.opciones?.length)) {
    const { rowCount } = await client.query(
      `UPDATE producto SET opcion_titulo = $2, opciones = $3
       WHERE id = $1 AND cardinality(opciones) = 0`,
      [p.id, p.opcion_titulo, p.opciones]
    );
    actualizados += rowCount;
  }
  await client.query(
    `UPDATE producto SET descripcion = 'Coca-Cola, Coca-Cola Zero, Sprite o Fanta.'
     WHERE descripcion = 'Coca-Cola, Coca-Cola Zero, Sprite o Fanta. Indica cuál en la nota.'`
  );
  await client.query('COMMIT');
  console.log(`Base de datos al día. Productos con opción obligatoria agregada: ${actualizados}.`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('No se pudo actualizar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
