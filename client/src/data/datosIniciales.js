/**
 * Datos iniciales de El 10, El carro futbolero: foodtruck de hamburguesas que
 * atiende en eventos e instala mesas para sus clientes.
 *
 * Es la configuración con la que parte el sistema: la carta (tomada de su
 * Instagram, @el10_carrofutbolero; precios y costos referenciales hasta que
 * El 10 los confirme), las mesas con sus tokens de QR y las cuentas del personal.
 * `npm run db:init` (server) carga estos datos en PostgreSQL. No hay pedidos ni
 * ventas: esos los genera la operación real de la aplicación.
 *
 *   restaurante  -> configuración general
 *   mesa         -> id, numero, token_qr, activa
 *   categoria    -> id, nombre, orden, icono
 *   producto     -> id, categoria_id, nombre, descripcion, precio, costo,
 *                   imagen_url, disponible, destacado
 */

export const restaurante = {
  nombre: 'El 10',
  bajada: 'El carro futbolero: la pasión y el sabor en un solo lugar.',
  direccion: 'Foodtruck en eventos · Región Metropolitana',
  horario: 'Atendiendo en el evento de hoy',
};

export const mesas = [
  { id: 1, numero: 1, token_qr: 'm1-7f3a9c', activa: true },
  { id: 2, numero: 2, token_qr: 'm2-b81e40', activa: true },
  { id: 3, numero: 3, token_qr: 'm3-c29d17', activa: true },
  { id: 4, numero: 4, token_qr: 'm4-e05b62', activa: true },
  { id: 5, numero: 5, token_qr: 'm5-a4f8d3', activa: true },
  { id: 6, numero: 6, token_qr: 'm6-91c7aa', activa: false },
];

export const categorias = [
  { id: 1, nombre: 'Hamburguesas', orden: 1, icono: 'sandwich' },
  { id: 2, nombre: 'Combos', orden: 2, icono: 'combo' },
  { id: 3, nombre: 'Acompañamientos', orden: 3, icono: 'papas' },
  { id: 4, nombre: 'Postres', orden: 4, icono: 'postre' },
  { id: 5, nombre: 'Bebidas', orden: 5, icono: 'vaso' },
];

const productosBase = [
  // Hamburguesas
  {
    id: 101,
    categoria_id: 1,
    nombre: 'Hamburguesa El 10',
    descripcion: 'La de la casa: carne, cebolla caramelizada, tocino y salsa BBQ.',
    precio: 8990,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },  {
    id: 102,
    categoria_id: 1,
    nombre: 'La gringa',
    descripcion: 'Carne, queso cheddar, lechuga, tomate, pepinillos y salsa de la casa.',
    precio: 7990,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 103,
    categoria_id: 1,
    nombre: 'Clásica',
    descripcion: 'Carne, queso, lechuga, tomate y mayonesa casera.',
    precio: 6490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 104,
    categoria_id: 1,
    nombre: 'Doble queso',
    descripcion: 'Doble carne y doble queso cheddar fundido.',
    precio: 9490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 105,
    categoria_id: 1,
    nombre: 'Pollo crispy',
    descripcion: 'Pollo apanado crujiente, lechuga, tomate y mayonesa de ajo.',
    precio: 7490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 106,
    categoria_id: 1,
    nombre: 'Veggie',
    descripcion: 'Hamburguesa de garbanzos, palta, tomate y salsa de yogur.',
    precio: 7490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Combos (hamburguesa + papas fritas + bebida en lata)
  {
    id: 201,
    categoria_id: 2,
    nombre: 'Combo El 10',
    descripcion: 'Hamburguesa El 10, papas fritas y bebida en lata.',
    precio: 11990,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },  {
    id: 202,
    categoria_id: 2,
    nombre: 'Combo La gringa',
    descripcion: 'La gringa, papas fritas y bebida en lata.',
    precio: 10990,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 203,
    categoria_id: 2,
    nombre: 'Combo clásico',
    descripcion: 'Hamburguesa clásica, papas fritas y bebida en lata.',
    precio: 9490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Acompañamientos
  {
    id: 301,
    categoria_id: 3,
    nombre: 'Papas fritas',
    descripcion: 'Porción de papas crujientes, con sal de mar.',
    precio: 3490,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },  {
    id: 302,
    categoria_id: 3,
    nombre: 'Papas cheddar y tocino',
    descripcion: 'Papas fritas con salsa cheddar y tocino crocante.',
    precio: 4990,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 303,
    categoria_id: 3,
    nombre: 'Aros de cebolla',
    descripcion: 'Ocho aros apanados, con salsa BBQ.',
    precio: 3990,
    imagen_url: null,
    disponible: false,
    destacado: false,
  },  {
    id: 304,
    categoria_id: 3,
    nombre: 'Nuggets de pollo',
    descripcion: 'Seis unidades, con salsa a elección.',
    precio: 4490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Postres
  {
    id: 401,
    categoria_id: 4,
    nombre: 'Brownie con helado',
    descripcion: 'Brownie tibio con una bola de helado de vainilla.',
    precio: 3490,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 402,
    categoria_id: 4,
    nombre: 'Churros con manjar',
    descripcion: 'Cuatro churros recién hechos, con manjar para untar.',
    precio: 2990,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Bebidas
  {
    id: 501,
    categoria_id: 5,
    nombre: 'Bebida en lata',
    descripcion: 'Coca-Cola, Coca-Cola Zero, Sprite o Fanta. Indica cuál en la nota.',
    precio: 1800,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 502,
    categoria_id: 5,
    nombre: 'Agua mineral',
    descripcion: 'Con o sin gas, 500 ml.',
    precio: 1500,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },  {
    id: 503,
    categoria_id: 5,
    nombre: 'Jugo natural',
    descripcion: 'Frutilla, piña o mango, preparado al momento.',
    precio: 2990,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
];

/**
 * Costo unitario de cada producto (insumos), usado por el dashboard
 * para calcular el margen de contribución en la ingeniería de menú.
 * Valores referenciales para la demostración.
 */
const COSTOS = {
  101: 3600, 102: 3100, 103: 2500, 104: 4000, 105: 2900, 106: 3100,
  201: 5100, 202: 4600, 203: 3900,
  301: 900, 302: 1700, 303: 1200, 304: 1600,
  401: 1100, 402: 800,
  501: 700, 502: 500, 503: 900,
};

export const productos = productosBase.map((p) => ({ ...p, costo: COSTOS[p.id] }));

/**
 * Usuarios del personal (en la BD real la contraseña se guarda con bcrypt).
 * El equipo de El 10 es de tres personas: dos en la cocina del carro, que
 * comparten la pantalla de cocina, y el administrador, que además atiende
 * las mesas como garzón (el rol de administrador accede a la vista del garzón).
 */
export const usuarios = [
  { id: 1, nombre: 'Diego', correo: 'admin@el10.cl', rol: 'administrador', activo: true },
  { id: 2, nombre: 'Cocina El 10', correo: 'cocina@el10.cl', rol: 'cocina', activo: true },
];

/** Contraseña inicial de las cuentas del personal (se puede cambiar en Administración › Usuarios). */
export const PASSWORD_DEMO = 'el10-2026';
