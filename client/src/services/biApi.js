/**
 * Indicadores del dashboard de inteligencia de negocio.
 *
 * Combina el historial simulado (12 semanas) con la operación del día
 * guardada en store.js, y calcula:
 *   - indicadores de ventas (RF11)
 *   - embudo de conversión de la carta (RF12)
 *   - matriz de ingeniería de menú ampliada con la conversión (RF12)
 *
 * En el sistema real, cada cálculo será una consulta SQL en el backend
 * (GET /api/dashboard/ventas?desde=&hasta=, /embudo, /ingenieria-menu);
 * la prueba de validación de datos compara estos valores con consultas de control.
 */

import { productos as productosIniciales, categorias as categoriasIniciales } from '../data/mockData';
import { categoriasActuales, productosActuales } from './catalogo';

/** Une el catálogo actual con los productos y categorías del historial (aunque se hayan retirado). */
function union(actuales, iniciales) {
  const ids = new Set(actuales.map((x) => x.id));
  return [...actuales, ...iniciales.filter((x) => !ids.has(x.id))];
}
const catalogoProductos = () => union(productosActuales(), productosIniciales);
const catalogoCategorias = () => union(categoriasActuales(), categoriasIniciales);
import { getHistorialSimulado, claveDia } from '../data/historialSimulado';
import { COLECCIONES, leer } from './store';
import { TIPOS_EVENTO } from './api';

const DIA_MS = 86400000;

export function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Datos de origen: historial simulado + operación registrada hoy en la app. */
function fuentes() {
  const h = getHistorialSimulado();
  const cuentasVivas = leer(COLECCIONES.CUENTAS).filter((c) => c.estado === 'cerrada');
  const idsVivas = new Set(cuentasVivas.map((c) => c.id));
  const pedidosVivos = leer(COLECCIONES.PEDIDOS).filter((p) => idsVivas.has(p.cuenta_id));
  return {
    cuentas: [...h.cuentas, ...cuentasVivas],
    pedidos: [...h.pedidos, ...pedidosVivos],
    embudoDiario: { ...h.embudoDiario, ...embudoDeEventosVivos() },
  };
}

/** Agrupa los eventos anónimos registrados en la app con la misma lógica del historial. */
function embudoDeEventosVivos() {
  const porDia = {};
  const sesiones = {};
  for (const e of leer(COLECCIONES.EVENTOS)) {
    const clave = `${claveDia(e.fecha)}|${e.sesion_id}`;
    const s = (sesiones[clave] ||= { dia: claveDia(e.fecha), vio: false, det: new Set(), add: new Set(), env: new Set() });
    if (e.tipo === TIPOS_EVENTO.VER_CARTA) s.vio = true;
    if (e.tipo === TIPOS_EVENTO.VER_DETALLE) s.det.add(e.producto_id);
    if (e.tipo === TIPOS_EVENTO.AGREGAR) s.add.add(e.producto_id);
    if (e.tipo === TIPOS_EVENTO.ENVIAR) s.env.add(e.producto_id);
  }
  for (const s of Object.values(sesiones)) {
    if (!s.vio) continue;
    const r = (porDia[s.dia] ||= { sesiones: 0, detalle: 0, agregar: 0, enviar: 0, productos: {} });
    r.sesiones += 1;
    const conAgregar = [...s.det].filter((id) => s.add.has(id));
    const conEnvio = conAgregar.filter((id) => s.env.has(id));
    if (s.det.size) r.detalle += 1;
    if (conAgregar.length) r.agregar += 1;
    if (conEnvio.length) r.enviar += 1;
    s.det.forEach((id) => {
      const fila = (r.productos[id] ||= [0, 0, 0]);
      fila[0] += 1;
      if (s.add.has(id)) fila[1] += 1;
      if (s.add.has(id) && s.env.has(id)) fila[2] += 1;
    });
  }
  return porDia;
}

const enRango = (iso, desde, hasta) => {
  const t = new Date(iso).getTime();
  return t >= desde.getTime() && t < hasta.getTime() + DIA_MS;
};

const minutos = (a, b) => (new Date(b) - new Date(a)) / 60000;

function kpis(cuentas, pedidos) {
  const ventas = cuentas.reduce((s, c) => s + c.total, 0);
  const entregados = pedidos.filter((p) => p.recibido_en);
  return {
    ventas,
    cuentas: cuentas.length,
    pedidos: pedidos.length,
    ticket: cuentas.length ? ventas / cuentas.length : 0,
    entrega: entregados.length
      ? entregados.reduce((s, p) => s + minutos(p.creado_en, p.recibido_en), 0) / entregados.length
      : 0,
  };
}

/** GET /api/dashboard/ventas?desde&hasta */
export function getIndicadoresVentas(desde, hasta) {
  const { cuentas, pedidos } = fuentes();
  const dias = Math.round((hasta - desde) / DIA_MS) + 1;
  const prevHasta = new Date(desde.getTime() - DIA_MS);
  const prevDesde = new Date(desde.getTime() - dias * DIA_MS);

  const cuentasR = cuentas.filter((c) => enRango(c.cerrada_en, desde, hasta));
  const ids = new Set(cuentasR.map((c) => c.id));
  const pedidosR = pedidos.filter((p) => ids.has(p.cuenta_id));
  const cuentasP = cuentas.filter((c) => enRango(c.cerrada_en, prevDesde, prevHasta));
  const idsP = new Set(cuentasP.map((c) => c.id));
  const pedidosP = pedidos.filter((p) => idsP.has(p.cuenta_id));

  // Ventas por día
  const porDia = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde.getTime() + i * DIA_MS);
    porDia.push({ clave: claveDia(d), fecha: d, ventas: 0, cuentas: 0 });
  }
  const idx = Object.fromEntries(porDia.map((d, i) => [d.clave, i]));
  cuentasR.forEach((c) => {
    const i = idx[claveDia(c.cerrada_en)];
    if (i !== undefined) {
      porDia[i].ventas += c.total;
      porDia[i].cuentas += 1;
    }
  });

  // Ventas por franja horaria (hora de envío del pedido)
  const franjas = {};
  for (let h = 12; h <= 23; h++) franjas[h] = 0;
  // Ventas y unidades por producto y por categoría
  const porProducto = Object.fromEntries(catalogoProductos().map((p) => [p.id, { ...p, unidades: 0, ventas: 0 }]));
  pedidosR.forEach((p) => {
    const h = new Date(p.creado_en).getHours();
    franjas[h] = (franjas[h] || 0) + p.total;
    p.detalle.forEach((d) => {
      const fila = porProducto[d.producto_id];
      if (!fila) return;
      fila.unidades += d.cantidad;
      fila.ventas += d.cantidad * d.precio_unitario;
    });
  });
  const listaProductos = Object.values(porProducto);
  const porCategoria = catalogoCategorias().map((c) => ({
    id: c.id,
    nombre: c.nombre,
    ventas: listaProductos.filter((p) => p.categoria_id === c.id).reduce((s, p) => s + p.ventas, 0),
  }));
  const ordenados = listaProductos.slice().sort((a, b) => b.unidades - a.unidades);

  return {
    actual: kpis(cuentasR, pedidosR),
    anterior: kpis(cuentasP, pedidosP),
    porDia,
    porFranja: Object.entries(franjas).map(([h, ventas]) => ({ franja: `${h}:00`, ventas })),
    porCategoria: porCategoria.sort((a, b) => b.ventas - a.ventas),
    masVendidos: ordenados.slice(0, 5),
    menosVendidos: ordenados.filter((p) => p.unidades > 0).slice(-5).reverse(),
    productos: listaProductos,
  };
}

/** GET /api/dashboard/embudo?desde&hasta */
export function getEmbudo(desde, hasta) {
  const { embudoDiario } = fuentes();
  const total = { sesiones: 0, detalle: 0, agregar: 0, enviar: 0 };
  const porProducto = Object.fromEntries(catalogoProductos().map((p) => [p.id, [0, 0, 0]]));
  Object.entries(embudoDiario).forEach(([clave, r]) => {
    const [a, m, d] = clave.split('-').map(Number);
    if (!enRango(new Date(a, m - 1, d), desde, hasta)) return;
    total.sesiones += r.sesiones;
    total.detalle += r.detalle;
    total.agregar += r.agregar;
    total.enviar += r.enviar;
    Object.entries(r.productos).forEach(([id, f]) => {
      if (!porProducto[id]) return;
      porProducto[id][0] += f[0];
      porProducto[id][1] += f[1];
      porProducto[id][2] += f[2];
    });
  });
  const etapas = [
    { etapa: 'Vio la carta', valor: total.sesiones },
    { etapa: 'Abrió el detalle de un producto', valor: total.detalle },
    { etapa: 'Agregó al pedido', valor: total.agregar },
    { etapa: 'Envió el pedido', valor: total.enviar },
  ];
  const productosEmbudo = catalogoProductos()
    .map((p) => {
      const [detalle, agregar, enviar] = porProducto[p.id];
      return {
        id: p.id,
        nombre: p.nombre,
        categoria_id: p.categoria_id,
        sesiones: total.sesiones,
        detalle,
        agregar,
        enviar,
        conversion: detalle ? enviar / detalle : 0,
      };
    })
    .sort((a, b) => b.detalle - a.detalle);
  return { etapas, productos: productosEmbudo };
}

export const CLASIFICACION = {
  ESTRELLA: 'Estrella',
  CABALLO: 'Caballo de batalla',
  ROMPECABEZAS: 'Rompecabezas',
  PERRO: 'Perro',
};

export const ACCION = {
  [CLASIFICACION.ESTRELLA]: 'Mantener y destacar en la carta.',
  [CLASIFICACION.CABALLO]: 'Revisar costo o precio para mejorar el margen.',
  [CLASIFICACION.ROMPECABEZAS]: 'Darle más visibilidad o revisar su descripción.',
  [CLASIFICACION.PERRO]: 'Evaluar reemplazarlo o retirarlo.',
};

/**
 * Ingeniería de menú (Kasavana y Smith, 1982), ampliada con la conversión del embudo.
 * Popularidad alta: participación >= 70 % de la participación promedio (1/N).
 * Margen alto: margen unitario >= margen promedio ponderado por unidades.
 */
export function getIngenieriaMenu(desde, hasta) {
  const { productos: ventas } = getIndicadoresVentas(desde, hasta);
  const embudo = getEmbudo(desde, hasta);
  const conv = Object.fromEntries(embudo.productos.map((p) => [p.id, p]));
  const lista = ventas.filter((p) => p.unidades > 0);
  const totalUnidades = lista.reduce((s, p) => s + p.unidades, 0);
  const umbralPopularidad = 0.7 * (1 / lista.length);
  const margenPromedio = lista.reduce((s, p) => s + (p.precio - p.costo) * p.unidades, 0) / (totalUnidades || 1);
  const conversionMedia =
    embudo.productos.reduce((s, p) => s + p.enviar, 0) / (embudo.productos.reduce((s, p) => s + p.detalle, 0) || 1);

  const items = lista.map((p) => {
    const participacion = p.unidades / totalUnidades;
    const margen = p.precio - p.costo;
    const popular = participacion >= umbralPopularidad;
    const rentable = margen >= margenPromedio;
    const clasificacion = popular
      ? rentable ? CLASIFICACION.ESTRELLA : CLASIFICACION.CABALLO
      : rentable ? CLASIFICACION.ROMPECABEZAS : CLASIFICACION.PERRO;
    const e = conv[p.id];
    const conversion = e?.conversion ?? 0;
    return {
      id: p.id,
      nombre: p.nombre,
      unidades: p.unidades,
      participacion,
      margen,
      clasificacion,
      vistas: e?.detalle ?? 0,
      conversion,
      // Alto interés y baja conversión: se mira mucho, pero se pide poco
      alerta: (e?.detalle ?? 0) > 0 && conversion < conversionMedia * 0.6,
    };
  });
  return {
    items: items.sort((a, b) => b.unidades - a.unidades),
    umbralUnidades: umbralPopularidad * totalUnidades,
    margenPromedio,
    conversionMedia,
  };
}

/** Rango de fechas disponible: desde el inicio del historial hasta hoy. */
export function rangoDisponible() {
  const { cuentas } = getHistorialSimulado();
  return { min: inicioDelDia(cuentas[0].abierta_en), max: inicioDelDia(new Date()) };
}
