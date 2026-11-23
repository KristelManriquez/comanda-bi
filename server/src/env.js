import dotenv from 'dotenv';

/**
 * Carga las variables de entorno del servidor.
 *
 * - .env.local: lo escribe la CLI de Neon (`neon deploy` / `neon env pull`) con
 *   DATABASE_URL (conexión con pooling) y DATABASE_URL_UNPOOLED (conexión directa).
 * - .env: el resto de la configuración (PORT, CLIENT_URL, JWT_SECRET).
 *
 * Si una variable está en ambos archivos, gana .env.local; las variables que ya
 * existen en el sistema (por ejemplo, en el servidor publicado) ganan sobre los dos.
 */
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
