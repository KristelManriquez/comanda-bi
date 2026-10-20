import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/health', healthRoutes);
// Próximamente:
// app.use('/api/mesas', mesasRoutes);         // validar token QR
// app.use('/api/carta', cartaRoutes);         // categorías + productos
// app.use('/api/pedidos', pedidosRoutes);     // crear y consultar pedidos
// app.use('/api/auth', authRoutes);           // login garzón / admin
// app.use('/api/dashboard', dashboardRoutes); // KPIs

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores centralizado
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

export default app;
