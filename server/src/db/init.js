/**
 * Crea las tablas y carga los datos iniciales de El 10.
 * Uso: npm run db:init   (OJO: borra los datos que hubiera)
 *
 * La carta, las mesas y los usuarios se toman de client/src/data/mockData.js,
 * para que la demo y la base de datos tengan exactamente los mismos datos
 * (incluidos los tokens de los QR).
 */
import '../env.js';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { categorias, mesas, productos, usuarios, PASSWORD_DEMO } from '../../../client/src/data/mockData.js';

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
      `INSERT INTO producto (id, categoria_id, nombre, descripcion, precio, costo, imagen_url, disponible, destacado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.costo, p.imagen_url, p.disponible, p.destacado]
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
  console.log(
    `Base de datos lista: ${categorias.length} categorías, ${productos.length} productos, ${mesas.length} mesas y ${usuarios.length} usuarios.`
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
