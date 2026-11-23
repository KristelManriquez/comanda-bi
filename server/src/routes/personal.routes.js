import { Router } from 'express';
import * as pedidos from '../services/pedidos.js';
import { login } from '../services/auth.js';
import { requiereRol } from '../middlewares/auth.js';

/** Rutas del personal: login y operación de garzón y cocina (protegidas con JWT y rol). */
const router = Router();

// POST /api/auth/login { correo, password } -> { token, usuario }
router.post('/auth/login', async (req, res) => {
  res.json(await login(req.body?.correo, req.body?.password));
});

// GET /api/pedidos?estado=solicitado -> cocina y garzón
router.get('/pedidos', requiereRol('garzon', 'cocina'), async (req, res) => {
  res.json(await pedidos.getPedidosSolicitados());
});

// PATCH /api/pedidos/:id { estado: 'recibido' } -> solo el garzón
router.patch('/pedidos/:id', requiereRol('garzon'), async (req, res) => {
  if (req.body?.estado !== 'recibido') return res.status(400).json({ error: 'Estado no válido' });
  res.json(await pedidos.marcarRecibido(Number(req.params.id), req.usuario));
});

// GET /api/mesas-estado -> mesas con su cuenta abierta (vista del garzón)
router.get('/mesas-estado', requiereRol('garzon'), async (req, res) => {
  res.json(await pedidos.getMesasConCuenta());
});

// POST /api/cuentas/:id/cerrar -> pago presencial
router.post('/cuentas/:id/cerrar', requiereRol('garzon'), async (req, res) => {
  res.json(await pedidos.cerrarCuenta(Number(req.params.id), req.usuario));
});

export default router;
