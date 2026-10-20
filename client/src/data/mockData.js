/**
 * Datos simulados del restaurante de prueba "Fork".
 *
 * La forma de estos objetos replica lo que entregará la API REST
 * (y, por debajo, las tablas de PostgreSQL), para que al conectar
 * el backend solo haya que cambiar services/api.js.
 *
 *   restaurante  -> configuración general
 *   mesa         -> id, numero, token_qr, activa
 *   categoria    -> id, nombre, orden, activa
 *   producto     -> id, categoria_id, nombre, descripcion, precio,
 *                   imagen_url, disponible, destacado
 */

export const restaurante = {
  nombre: 'Fork',
  bajada: 'Cocina chilena de siempre, servida a tu manera.',
  direccion: 'Av. Italia 1450, Providencia',
  horario: 'Abierto hasta las 23:30',
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
  { id: 1, nombre: 'Entradas', orden: 1, icono: 'empanada' },
  { id: 2, nombre: 'Platos de fondo', orden: 2, icono: 'plato' },
  { id: 3, nombre: 'Sándwiches', orden: 3, icono: 'sandwich' },
  { id: 4, nombre: 'Postres', orden: 4, icono: 'postre' },
  { id: 5, nombre: 'Bebidas', orden: 5, icono: 'vaso' },
  { id: 6, nombre: 'Tragos', orden: 6, icono: 'copa' },
];

export const productos = [
  // Entradas
  {
    id: 101,
    categoria_id: 1,
    nombre: 'Empanada de pino',
    descripcion: 'Horneada, con carne picada a cuchillo, cebolla, huevo, aceituna y pasas.',
    precio: 3500,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },
  {
    id: 102,
    categoria_id: 1,
    nombre: 'Machas a la parmesana',
    descripcion: 'Doce machas gratinadas con queso parmesano, mantequilla y vino blanco.',
    precio: 9900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 103,
    categoria_id: 1,
    nombre: 'Sopaipillas con pebre',
    descripcion: 'Seis sopaipillas de zapallo recién fritas, con pebre de la casa.',
    precio: 4200,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 104,
    categoria_id: 1,
    nombre: 'Ensalada chilena',
    descripcion: 'Tomate, cebolla pluma amortiguada, cilantro y aceite de oliva.',
    precio: 3900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Platos de fondo
  {
    id: 201,
    categoria_id: 2,
    nombre: 'Pastel de choclo',
    descripcion: 'En greda, con pino, pollo, huevo y aceituna bajo pastelera de choclo dorada.',
    precio: 11900,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },
  {
    id: 202,
    categoria_id: 2,
    nombre: 'Lomo a lo pobre',
    descripcion: 'Lomo vetado de 300 g, papas fritas, cebolla caramelizada y dos huevos fritos.',
    precio: 14900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 203,
    categoria_id: 2,
    nombre: 'Chorrillana para dos',
    descripcion: 'Papas fritas, carne salteada, cebolla, longaniza y huevos fritos.',
    precio: 16900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 204,
    categoria_id: 2,
    nombre: 'Cazuela de vacuno',
    descripcion: 'Osobuco, papa, zapallo, choclo y porotos verdes en caldo casero.',
    precio: 10900,
    imagen_url: null,
    disponible: false,
    destacado: false,
  },
  {
    id: 205,
    categoria_id: 2,
    nombre: 'Reineta con puré picante',
    descripcion: 'Filete de reineta a la plancha con puré de papas al merkén.',
    precio: 12900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Sándwiches
  {
    id: 301,
    categoria_id: 3,
    nombre: 'Churrasco italiano',
    descripcion: 'Carne de vacuno laminada, palta, tomate y mayonesa casera en pan frica.',
    precio: 8900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 302,
    categoria_id: 3,
    nombre: 'Barros Luco',
    descripcion: 'Carne de vacuno laminada con queso mantecoso derretido en marraqueta.',
    precio: 8500,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 303,
    categoria_id: 3,
    nombre: 'Completo italiano',
    descripcion: 'Vienesa artesanal, palta, tomate y mayonesa casera.',
    precio: 4500,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },

  // Postres
  {
    id: 401,
    categoria_id: 4,
    nombre: 'Leche asada',
    descripcion: 'Receta de la abuela, con caramelo tostado.',
    precio: 3900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 402,
    categoria_id: 4,
    nombre: 'Mote con huesillo',
    descripcion: 'Bien helado, con huesillos de la temporada.',
    precio: 3500,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 403,
    categoria_id: 4,
    nombre: 'Panqueques con manjar',
    descripcion: 'Dos panqueques rellenos de manjar, con azúcar flor.',
    precio: 4500,
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
    precio: 2000,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 502,
    categoria_id: 5,
    nombre: 'Jugo natural',
    descripcion: 'Frutilla, piña o mango, preparado al momento.',
    precio: 3500,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 503,
    categoria_id: 5,
    nombre: 'Agua mineral',
    descripcion: 'Con o sin gas, 500 ml.',
    precio: 1800,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },

  // Tragos
  {
    id: 601,
    categoria_id: 6,
    nombre: 'Pisco sour',
    descripcion: 'Pisco chileno 35°, limón de pica y amargo de angostura.',
    precio: 5500,
    imagen_url: null,
    disponible: true,
    destacado: true,
  },
  {
    id: 602,
    categoria_id: 6,
    nombre: 'Terremoto',
    descripcion: 'Pipeño, helado de piña y un toque de granadina.',
    precio: 4900,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
  {
    id: 603,
    categoria_id: 6,
    nombre: 'Copa de vino',
    descripcion: 'Carmenere o Sauvignon Blanc del Valle de Colchagua.',
    precio: 4500,
    imagen_url: null,
    disponible: true,
    destacado: false,
  },
];
