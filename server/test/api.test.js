/**
 * Pruebas de integración de la API (Express + PostgreSQL + Socket.IO).
 * Cada ejecución parte de una base de pruebas limpia, con los datos iniciales de El 10.
 * Los nombres de las pruebas indican el requerimiento (RF / RNF) que verifican.
 */
import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { io as conectar } from 'socket.io-client';
import app, { ORIGENES } from '../src/app.js';
import { iniciarSockets } from '../src/sockets/index.js';
import { pool, query } from '../src/db/pool.js';
import { cargarDatosIniciales } from '../src/db/cargarDatos.js';

const MESA_1 = 'm1-7f3a9c';
const MESA_INACTIVA = 'm6-c2d8a1';
const MESA_4 = 'm4-e05b62'; // pedidos que no deben alterar las cuentas de la mesa 1
const SESION = '6f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';

let server;
let url;
const tokens = {};
const api = () => request(app);
const conToken = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });

async function login(correo) {
  const res = await api().post('/api/auth/login').send({ correo, password: 'el10-2026' });
  return res.body.token;
}

beforeAll(async () => {
  await cargarDatosIniciales(pool);
  server = createServer(app);
  iniciarSockets(server, ORIGENES);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
  tokens.admin = await login('admin@el10.cl');
  tokens.cocina = await login('cocina@el10.cl');
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

describe('Comensal (RF01 a RF05)', () => {
  it('RF01: un QR válido abre la carta de su mesa', async () => {
    const res = await api().get(`/api/mesas/${MESA_1}`);
    expect(res.status).toBe(200);
    expect(res.body.numero).toBe(1);
  });

  it('RF01 / RNF03: un QR inexistente o de una mesa desactivada se rechaza', async () => {
    expect((await api().get('/api/mesas/no-existe')).status).toBe(404);
    expect((await api().get(`/api/mesas/${MESA_INACTIVA}`)).status).toBe(404);
  });

  it('RF02: la carta trae categorías y productos, sin exponer el costo', async () => {
    const res = await api().get('/api/carta');
    expect(res.status).toBe(200);
    const productos = res.body.categorias.flatMap((c) => c.productos);
    expect(productos.length).toBeGreaterThan(0);
    expect(productos.every((p) => !('costo' in p))).toBe(true);
  });

  it('RF04 / RNF04: el servidor calcula el precio, aunque el navegador envíe otro', async () => {
    const res = await api()
      .post('/api/pedidos')
      .send({ token_mesa: MESA_1, items: [{ producto_id: 101, cantidad: 2, nota: 'sin cebolla', precio: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(2 * 8990);
    expect(res.body.estado).toBe('solicitado');
  });

  it('RF04 / OE2: no acepta pedidos con productos agotados', async () => {
    const res = await api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [{ producto_id: 303, cantidad: 1 }] });
    expect(res.status).toBe(409);
  });

  it('RF04: rechaza pedidos vacíos o con cantidades no válidas', async () => {
    expect((await api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [] })).status).toBe(400);
    expect((await api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [{ producto_id: 101, cantidad: 0 }] })).status).toBe(400);
  });

  it('RF03 / RF04: una bebida en lata o un jugo no se pueden pedir sin elegir la marca o el sabor', async () => {
    const pedir = (item) => api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [item] });
    const sinMarca = await pedir({ producto_id: 501, cantidad: 1 });
    expect(sinMarca.status).toBe(400);
    expect(sinMarca.body.error).toMatch(/marca/i);
    expect((await pedir({ producto_id: 503, cantidad: 1, opcion: '' })).status).toBe(400);
    // Una opción que no está en la carta tampoco sirve
    expect((await pedir({ producto_id: 503, cantidad: 1, opcion: 'Maracuyá' })).status).toBe(400);
  });

  it('RF03 / RF04: la opción elegida queda en el pedido; en productos sin opciones se ignora', async () => {
    const carta = await api().get('/api/carta');
    const lata = carta.body.categorias.flatMap((c) => c.productos).find((p) => p.id === 501);
    expect(lata.opcion_titulo).toBe('Marca');
    expect(lata.opciones).toContain('Coca-Cola Zero');

    const res = await api()
      .post('/api/pedidos')
      .send({ token_mesa: MESA_4, items: [{ producto_id: 501, cantidad: 2, opcion: 'Coca-Cola Zero' }, { producto_id: 101, cantidad: 1, opcion: 'Fanta' }] });
    expect(res.status).toBe(201);
    expect(res.body.detalle.map((d) => d.opcion)).toEqual(['Coca-Cola Zero', '']);
  });

  it('RF05: la mesa ve sus pedidos de la cuenta abierta', async () => {
    const res = await api().get(`/api/mesas/${MESA_1}/pedidos`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('RF12 / RNF05: registra eventos anónimos e ignora los tipos no permitidos', async () => {
    const antes = (await query('SELECT COUNT(*)::int AS n FROM evento_navegacion')).rows[0].n;
    await api().post('/api/eventos').send({ sesion_id: SESION, tipo: 'ver_detalle', producto_id: 101 }).expect(204);
    await api().post('/api/eventos').send({ sesion_id: SESION, tipo: 'robar_datos' }).expect(204);
    await api().post('/api/eventos').send({ sesion_id: 'no-es-uuid', tipo: 'ver_carta' }).expect(204);
    const despues = (await query('SELECT COUNT(*)::int AS n FROM evento_navegacion')).rows[0].n;
    expect(despues - antes).toBe(1);
  });
});

describe('Garzón y cocina (RF06 a RF08)', () => {
  it('RF06: inicia sesión con correo y contraseña; rechaza una contraseña incorrecta', async () => {
    const mala = await api().post('/api/auth/login').send({ correo: 'admin@el10.cl', password: 'otra-clave' });
    expect(mala.status).toBe(401);
    expect(tokens.admin).toBeTruthy();
  });

  it('RNF03: sin sesión no se pueden ver los pedidos', async () => {
    expect((await api().get('/api/pedidos')).status).toBe(401);
  });

  it('RF06: la cocina ve los pedidos solicitados', async () => {
    const res = await api().get('/api/pedidos').set(conToken('cocina'));
    expect(res.status).toBe(200);
    expect(res.body[0].detalle[0].nota).toBe('sin cebolla');
  });

  it('RF06 / RNF02: el aviso del pedido llega al personal en 2 segundos o menos', async () => {
    const socket = conectar(url, { auth: { jwt: tokens.cocina }, transports: ['websocket'] });
    await new Promise((r) => socket.on('connect', r));
    const llegada = new Promise((r) => socket.once('pedidos:cambio', () => r(Date.now())));
    const inicio = Date.now();
    await api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [{ producto_id: 301, cantidad: 1 }] });
    const ms = (await llegada) - inicio;
    socket.close();
    console.log(`Latencia pedido → cocina: ${ms} ms`);
    expect(ms).toBeLessThanOrEqual(2000);
  });

  it('RF08: no se puede cerrar una cuenta con pedidos sin entregar', async () => {
    const { rows } = await query(`SELECT id FROM cuenta WHERE estado = 'abierta' AND mesa_id = 1`);
    const res = await api().post(`/api/cuentas/${rows[0].id}/cerrar`).set(conToken('admin'));
    expect(res.status).toBe(409);
  });

  it('RF07 / RNF03: solo el garzón (o el administrador) marca un pedido como recibido', async () => {
    const pedidos = (await api().get('/api/pedidos').set(conToken('cocina'))).body;
    const id = pedidos[0].id;
    expect((await api().patch(`/api/pedidos/${id}`).set(conToken('cocina')).send({ estado: 'recibido' })).status).toBe(403);
    const ok = await api().patch(`/api/pedidos/${id}`).set(conToken('admin')).send({ estado: 'recibido' });
    expect(ok.status).toBe(200);
    expect(ok.body.estado).toBe('recibido');
    const { rows } = await query(`SELECT usuario_id FROM historial_estado_pedido WHERE pedido_id = $1 AND estado = 'recibido'`, [id]);
    expect(rows[0].usuario_id).toBe(1); // queda registrado quién lo entregó
  });

  it('RF07 / RF08: el garzón ve la mesa con su consumo y cierra la cuenta con el total correcto', async () => {
    const pendientes = (await api().get('/api/pedidos').set(conToken('cocina'))).body;
    for (const p of pendientes) {
      await api().patch(`/api/pedidos/${p.id}`).set(conToken('admin')).send({ estado: 'recibido' });
    }
    const mesas = (await api().get('/api/mesas-estado').set(conToken('admin'))).body;
    const mesa1 = mesas.find((m) => m.numero === 1);
    expect(mesa1.cuenta.total).toBe(2 * 8990 + 3490);
    const cierre = await api().post(`/api/cuentas/${mesa1.cuenta.id}/cerrar`).set(conToken('admin'));
    expect(cierre.status).toBe(200);
    expect(cierre.body.total).toBe(2 * 8990 + 3490);
    expect((await api().post(`/api/cuentas/${mesa1.cuenta.id}/cerrar`).set(conToken('admin'))).status).toBe(409);
  });
});

describe('Administración (RF09 y RF10)', () => {
  it('RNF03: la cocina no puede entrar a la administración', async () => {
    expect((await api().get('/api/admin/productos').set(conToken('cocina'))).status).toBe(403);
  });

  it('RF09: valida que el costo sea menor que el precio', async () => {
    const res = await api()
      .post('/api/admin/productos')
      .set(conToken('admin'))
      .send({ nombre: 'Completo', categoria_id: 1, precio: 3000, costo: 3500 });
    expect(res.status).toBe(400);
    expect(res.body.campo).toBe('costo');
  });

  it('RF09: el administrador define la opción obligatoria de un producto y se valida', async () => {
    const nuevo = (extra) => api().post('/api/admin/productos').set(conToken('admin'))
      .send({ nombre: 'Néctar', categoria_id: 5, precio: 2000, costo: 800, ...extra });
    expect((await nuevo({ opcion_titulo: 'Sabor', opciones: 'Durazno' })).body.campo).toBe('opciones');
    expect((await nuevo({ opcion_titulo: '', opciones: 'Durazno, Damasco' })).body.campo).toBe('opcion_titulo');
    const res = await nuevo({ opcion_titulo: 'Sabor', opciones: 'Durazno, Damasco' });
    expect(res.status).toBe(201);
    expect(res.body.opciones).toEqual(['Durazno', 'Damasco']);
  });

  it('RF09 / OE2: un cambio de precio se refleja de inmediato en la carta', async () => {
    const producto = (await api().get('/api/admin/productos').set(conToken('admin'))).body.find((p) => p.id === 103);
    await api().put('/api/admin/productos/103').set(conToken('admin')).send({ ...producto, precio: 6990 }).expect(200);
    const carta = (await api().get('/api/carta')).body.categorias.flatMap((c) => c.productos);
    expect(carta.find((p) => p.id === 103).precio).toBe(6990);
  });

  it('RF09 / OE2: un producto marcado como agotado ya no se puede pedir', async () => {
    await api().patch('/api/admin/productos/104').set(conToken('admin')).send({ disponible: false }).expect(200);
    const res = await api().post('/api/pedidos').send({ token_mesa: MESA_1, items: [{ producto_id: 104, cantidad: 1 }] });
    expect(res.status).toBe(409);
  });

  it('RF10: crea una mesa con un QR aleatorio y no desactiva mesas con cuenta abierta', async () => {
    const mesa = (await api().post('/api/admin/mesas').set(conToken('admin'))).body;
    expect(mesa.numero).toBe(7);
    expect(mesa.token_qr).toMatch(/^m7-[0-9a-f]{6}$/);
    await api().post('/api/pedidos').send({ token_mesa: mesa.token_qr, items: [{ producto_id: 501, cantidad: 1, opcion: 'Sprite' }] }).expect(201);
    expect((await api().patch(`/api/admin/mesas/${mesa.id}`).set(conToken('admin')).send({ activa: false })).status).toBe(409);
  });

  it('RF10: crea usuarios con contraseña segura y no permite quitarse el propio rol', async () => {
    const corta = await api()
      .post('/api/admin/usuarios')
      .set(conToken('admin'))
      .send({ nombre: 'Camila', correo: 'camila@el10.cl', rol: 'cocina', clave: '123' });
    expect(corta.status).toBe(400);
    const nueva = await api()
      .post('/api/admin/usuarios')
      .set(conToken('admin'))
      .send({ nombre: 'Camila', correo: 'camila@el10.cl', rol: 'cocina', clave: 'cocina-2026' });
    expect(nueva.status).toBe(201);
    const { rows } = await query(`SELECT contrasena_hash FROM usuario WHERE correo = 'camila@el10.cl'`);
    expect(rows[0].contrasena_hash).toMatch(/^\$2[aby]\$/); // guardada con bcrypt
    const propia = await api()
      .put('/api/admin/usuarios/1')
      .set(conToken('admin'))
      .send({ nombre: 'Diego', correo: 'admin@el10.cl', rol: 'garzon' });
    expect(propia.status).toBe(409);
  });
});

describe('Dashboard (RF11 y RF12, OE3)', () => {
  const rango = () => {
    const hoy = new Date();
    const desde = new Date(hoy.getTime() - 86400000).toISOString();
    const hasta = new Date(hoy.getTime() + 86400000).toISOString();
    return { desde, hasta };
  };

  it('OE3: las ventas del dashboard coinciden con la consulta SQL de control', async () => {
    const { desde, hasta } = rango();
    const res = await api().get('/api/admin/dashboard').query({ desde, hasta }).set(conToken('admin'));
    expect(res.status).toBe(200);
    const ventasApi = res.body.cuentas.reduce((s, c) => s + c.total, 0);
    const detalleApi = res.body.pedidos.flatMap((p) => p.detalle).reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);
    const control = await query(
      `SELECT COALESCE(SUM(d.cantidad * d.precio_unitario), 0)::int AS ventas
       FROM cuenta c JOIN pedido p ON p.cuenta_id = c.id JOIN detalle_pedido d ON d.pedido_id = p.id
       WHERE c.estado = 'cerrada' AND c.cerrada_en >= $1 AND c.cerrada_en < $2`,
      [desde, hasta]
    );
    expect(ventasApi).toBe(control.rows[0].ventas);
    expect(detalleApi).toBe(control.rows[0].ventas);
    expect(ventasApi).toBe(2 * 8990 + 3490);
  });

  it('RNF02: los datos del dashboard se entregan en 3 segundos o menos', async () => {
    const { desde, hasta } = rango();
    const inicio = Date.now();
    await api().get('/api/admin/dashboard').query({ desde, hasta }).set(conToken('admin')).expect(200);
    const ms = Date.now() - inicio;
    console.log(`Carga de datos del dashboard: ${ms} ms`);
    expect(ms).toBeLessThanOrEqual(3000);
  });

  it('RF12: los eventos del embudo llegan al dashboard sin datos personales', async () => {
    const { desde, hasta } = rango();
    const res = await api().get('/api/admin/dashboard').query({ desde, hasta }).set(conToken('admin'));
    expect(res.body.eventos.length).toBeGreaterThan(0);
    expect(Object.keys(res.body.eventos[0]).sort()).toEqual(['fecha', 'mesa_id', 'producto_id', 'sesion_id', 'tipo']);
  });
});
