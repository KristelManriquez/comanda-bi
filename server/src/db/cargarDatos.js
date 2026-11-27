import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { categorias, mesas, productos, usuarios, PASSWORD_DEMO } from '../../../client/src/data/datosIniciales.js';

/**
 * Crea las tablas (schema.sql) y carga los datos iniciales de El 10 dentro de
 * una transacción. Lo usan `npm run db:init` y las pruebas de integración.
 * OJO: borra los datos que hubiera.
 */
export async function cargarDatosIniciales(pool) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);
    for (const c of categorias) {
      await client.query('INSERT INTO categoria (id, nombre, orden, icono) VALUES ($1, $2, $3, $4)', [c.id, c.nombre, c.orden, c.icono]);
    }
    for (const p of productos) {
      await client.query(
        `INSERT INTO producto (id, categoria_id, nombre, descripcion, precio, costo, imagen_url, disponible, destacado,
           opcion_titulo, opciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.costo, p.imagen_url, p.disponible, p.destacado,
         p.opcion_titulo ?? '', p.opciones ?? []]
      );
    }
    for (const m of mesas) {
      await client.query('INSERT INTO mesa (id, numero, token_qr, activa) VALUES ($1, $2, $3, $4)', [m.id, m.numero, m.token_qr, m.activa]);
    }
    const hash = await bcrypt.hash(PASSWORD_DEMO, 10);
    for (const u of usuarios) {
      await client.query(
        'INSERT INTO usuario (id, nombre, correo, contrasena_hash, rol, activo) VALUES ($1, $2, $3, $4, $5, $6)',
        [u.id, u.nombre, u.correo, hash, u.rol, u.activo]
      );
    }
    // Los ids se insertaron a mano: se ajustan las secuencias para que los próximos sigan desde ahí
    for (const tabla of ['categoria', 'producto', 'mesa', 'usuario']) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${tabla}', 'id'), (SELECT MAX(id) FROM ${tabla}))`);
    }
    await client.query('COMMIT');
    return { categorias: categorias.length, productos: productos.length, mesas: mesas.length, usuarios: usuarios.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
