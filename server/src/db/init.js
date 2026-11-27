/**
 * Crea las tablas y carga los datos iniciales de El 10.
 * Uso: npm run db:init   (OJO: borra los datos que hubiera)
 *
 * La carta, las mesas y los usuarios se toman de client/src/data/datosIniciales.js,
 * para que la demo y la base de datos tengan exactamente los mismos datos
 * (incluidos los tokens de los QR).
 */
import '../env.js';
import { pool } from './pool.js';
import { cargarDatosIniciales } from './cargarDatos.js';

try {
  const n = await cargarDatosIniciales(pool);
  console.log(`Base de datos lista: ${n.categorias} categorías, ${n.productos} productos, ${n.mesas} mesas y ${n.usuarios} usuarios.`);
} catch (error) {
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
