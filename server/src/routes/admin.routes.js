import { Router } from 'express';
import * as admin from '../services/admin.js';
import { requiereRol } from '../middlewares/auth.js';

/** Rutas de administración: solo para el rol administrador (JWT). */
const router = Router();
router.use(requiereRol());

const id = (req) => Number(req.params.id);

// Categorías
router.get('/categorias', async (req, res) => res.json(await admin.getCategorias()));
router.post('/categorias', async (req, res) => res.status(201).json(await admin.guardarCategoria(null, req.body)));
router.patch('/categorias/:id', async (req, res) => res.json(await admin.guardarCategoria(id(req), req.body)));
router.post('/categorias/:id/mover', async (req, res) => {
  await admin.moverCategoria(id(req), Number(req.body?.direccion));
  res.status(204).end();
});
router.delete('/categorias/:id', async (req, res) => {
  await admin.eliminarCategoria(id(req));
  res.status(204).end();
});

// Productos (con costo; los retirados también)
router.get('/productos', async (req, res) => res.json(await admin.getProductos()));
router.post('/productos', async (req, res) => res.status(201).json(await admin.guardarProducto(null, req.body)));
router.put('/productos/:id', async (req, res) => res.json(await admin.guardarProducto(id(req), req.body)));
// PATCH { disponible } o { activo }
router.patch('/productos/:id', async (req, res) => res.json(await admin.cambiarEstadoProducto(id(req), req.body)));

// Mesas y códigos QR
router.get('/mesas', async (req, res) => res.json(await admin.getMesas()));
router.post('/mesas', async (req, res) => res.status(201).json(await admin.crearMesa()));
router.patch('/mesas/:id', async (req, res) => res.json(await admin.setActivaMesa(id(req), req.body?.activa)));
router.post('/mesas/:id/regenerar-qr', async (req, res) => res.json(await admin.regenerarQr(id(req))));

// Usuarios del personal
router.get('/usuarios', async (req, res) => res.json(await admin.getUsuarios()));
router.post('/usuarios', async (req, res) => res.status(201).json(await admin.guardarUsuario(null, req.body, req.usuario)));
router.put('/usuarios/:id', async (req, res) => res.json(await admin.guardarUsuario(id(req), req.body, req.usuario)));

// Dashboard: GET /api/admin/dashboard?desde=ISO&hasta=ISO
router.get('/dashboard', async (req, res) => res.json(await admin.getDatosDashboard(req.query.desde, req.query.hasta)));
router.get('/dashboard/rango', async (req, res) => res.json(await admin.getPrimeraFecha()));

export default router;
