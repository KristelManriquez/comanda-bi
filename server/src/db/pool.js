import pg from 'pg';

// Las sumas (SUM, COUNT) llegan como texto por defecto; los montos en CLP caben en un número de JavaScript
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

/**
 * Conexiones de Neon:
 * - DATABASE_URL (con pooling, "-pooler"): el tráfico normal de la API.
 * - DATABASE_URL_UNPOOLED (directa): crear o cambiar el esquema (npm run db:init),
 *   porque el pooling de Neon (PgBouncer) no mantiene el estado de la sesión.
 * La CLI de Neon escribe ambas en server/.env.local.
 */
const directa = process.argv.includes('--directa');
const connectionString = directa
  ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Falta DATABASE_URL: ejecuta `neon env pull` en la carpeta server (o completa server/.env).');
  process.exit(1);
}

export const pool = new pg.Pool({ connectionString });

export const query = (text, params) => pool.query(text, params);

/** Ejecuta `fn` dentro de una transacción: si algo falla, no queda nada a medias. */
export async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
