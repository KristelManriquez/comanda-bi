import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import comensalRoutes from './routes/comensal.routes.js';
import personalRoutes from './routes/personal.routes.js';

/** Orígenes que pueden llamar a la API (el front local y el publicado en Vercel). */
export const ORIGENES = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());

const app = express();

app.use(cors({ origin: ORIGENES }));
app.use(express.json({ limit: '50kb' }));

app.use('/api/health', healthRoutes);
app.use('/api', personalRoutes);
app.use('/api', comensalRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo centralizado de errores: los esperados traen su código HTTP; el resto es 500
app.use((err, req, res, _next) => {
  if (!err.status || err.status >= 500) console.error(err);
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

export default app;
