import { Router } from 'express';
import * as pedidos from '../services/pedidos.js';

/** Rutas públicas del comensal: no requieren login, se identifican con el token del QR. */
const router = Router();

// GET /api/mesas/:token -> valida el QR
router.get('/mesas/:token', async (req, res) => {
  res.json(await pedidos.getMesaPorToken(req.params.token));
});

// GET /api/carta -> categorías con sus productos (sin costo)
router.get('/carta', async (req, res) => {
  res.json({ categorias: await pedidos.getCarta() });
});

// GET /api/mesas/:token/pedidos -> pedidos de la cuenta abierta de la mesa
router.get('/mesas/:token/pedidos', async (req, res) => {
  res.json(await pedidos.getPedidosDeMesa(req.params.token));
});

// POST /api/pedidos { token_mesa, items: [{ producto_id, cantidad, nota }] }
router.post('/pedidos', async (req, res) => {
  const pedido = await pedidos.crearPedido({ tokenMesa: req.body.token_mesa, items: req.body.items });
  res.status(201).json(pedido);
});

// GET /api/mesas/:token/pedidos/:id -> seguimiento de un pedido de esa mesa
router.get('/mesas/:token/pedidos/:id', async (req, res) => {
  res.json(await pedidos.getPedidoDeMesa(Number(req.params.id), req.params.token));
});

// POST /api/eventos { sesion_id, tipo, mesa_id, producto_id } -> navegación anónima
router.post('/eventos', async (req, res) => {
  const { sesion_id, tipo, mesa_id, producto_id } = req.body ?? {};
  await pedidos.registrarEvento({ sesionId: sesion_id, tipo, mesaId: mesa_id, productoId: producto_id });
  res.status(204).end();
});

export default router;
