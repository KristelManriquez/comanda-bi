import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'comanda-bi-api', fecha: new Date().toISOString() });
});

export default router;
