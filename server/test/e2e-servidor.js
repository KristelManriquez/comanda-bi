/**
 * Servidor para las pruebas de sistema (Playwright): usa la base de pruebas,
 * la deja con los datos iniciales de El 10 y levanta la API en el puerto 4100.
 * Lo inicia automáticamente `npm run test:e2e` en la carpeta client.
 */
import './setup.js';

process.env.PORT = process.env.E2E_API_PORT || '4100';
process.env.CLIENT_URL = process.env.E2E_CLIENT_URL || 'http://localhost:5180';

const { pool } = await import('../src/db/pool.js');
const { cargarDatosIniciales } = await import('../src/db/cargarDatos.js');
await cargarDatosIniciales(pool);
await import('../src/index.js');
