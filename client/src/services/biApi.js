/**
 * Indicadores del dashboard de inteligencia de negocio de El 10.
 *
 * Solo usa datos reales registrados por la aplicación:
 *  - Con servidor (MODO_API): GET /api/admin/dashboard?desde&hasta entrega las cuentas
 *    cerradas (ventas pagadas), sus pedidos, los eventos anónimos de navegación y el
 *    catálogo, todo desde PostgreSQL.
 *  - Demo sin servidor: los mismos datos guardados en el navegador (store.js).
 *
 * Con esos datos se calculan:
 *   - indicadores de ventas (RF11)
 *   - embudo de conversión de la carta (RF12)
 *   - matriz de ingeniería de menú ampliada con la conversión (RF12)
 * La prueba de validación de datos compara estos valores con consultas SQL de control.
 */

import { categoriasActuales, productosActuales } from './catalogo';
import { COLECCIONES, leer } from './store';
import { TIPOS_EVENTO } from './api';
import { http, MODO_API } from './http';

const DIA_MS = 86400000;

export function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Clave AAAA-MM-DD del día local de una fecha. */
export const claveDia = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Suma días respetando el calendario local (los cambios de horario no descuadran los días). */
const sumarDias = (fecha, dias) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
};

const enRango = (iso, desde, hasta) => {
  const t = new Date(iso).getTime();
  return t >= desde.getTime() && t < sumarDias(hasta, 1).getTime();
};

/**
 * Datos de origen entre `desde` y `hasta` (días completos) más el periodo anterior
 * de igual duración, para comparar.
 */
async function cargarFuentes(desde, hasta) {
  const dias = Math.round((hasta - desde) / DIA_MS) + 1;
  const inicio = sumarDias(desde, -dias);
  const fin = sumarDias(hasta, 1);
  if (MODO_API) {
    const q = new URLSearchParams({ desde: inicio.toISOString(), hasta: fin.toISOString() });
    return http(`/admin/dashboard?${q}`, { personal: true });
  }
  const cuentas = leer(COLECCIONES.CUENTAS).filter((c) => c.estado === 'cerrada');
  const ids = new Set(cuentas.map((c) => c.id));
  return {
    cuentas,
    pedidos: leer(COLECCIONES.PEDIDOS).filter((p) => ids.has(p.cuenta_id)),
    eventos: leer(COLECCIONES.EVENTOS),
    productos: productosActuales(),
    categorias: categoriasActuales(),
  };
}

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

function calcularVentas(f, desde, hasta) {
  const dias = Math.round((hasta - desde) / DIA_MS) + 1;
  const prevHasta = sumarDias(desde, -1);
  const prevDesde = sumarDias(desde, -dias);

  const cuentasR = f.cuentas.filter((c) => enRango(c.cerrada_en, desde, hasta));
  const ids = new Set(cuentasR.map((c) => c.id));
  const pedidosR = f.pedidos.filter((p) => ids.has(p.cuenta_id));
  const cuentasP = f.cuentas.filter((c) => enRango(c.cerrada_en, prevDesde, prevHasta));
  const idsP = new Set(cuentasP.map((c) => c.id));
  const pedidosP = f.pedidos.filter((p) => idsP.has(p.cuenta_id));

  // Ventas por día
  const porDia = [];
  for (let i = 0; i < dias; i++) {
    const d = sumarDias(desde, i);
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

  // Ventas por franja horaria (hora de envío del pedido); se agregan las horas fuera de 12-23 si hay ventas
  const franjas = {};
  for (let h = 12; h <= 23; h++) franjas[h] = 0;
  // Ventas y unidades por producto y por categoría
  const porProducto = Object.fromEntries(f.productos.map((p) => [p.id, { ...p, unidades: 0, ventas: 0 }]));
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
  const porCategoria = f.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    ventas: listaProductos.filter((p) => p.categoria_id === c.id).reduce((s, p) => s + p.ventas, 0),
  }));
  const vendidos = listaProductos.filter((p) => p.unidades > 0).sort((a, b) => b.unidades - a.unidades);

  return {
    actual: kpis(cuentasR, pedidosR),
    anterior: kpis(cuentasP, pedidosP),
    porDia,
    porFranja: Object.entries(franjas).map(([h, ventas]) => ({ franja: `${h}:00`, ventas })),
    porCategoria: porCategoria.sort((a, b) => b.ventas - a.ventas),
    masVendidos: vendidos.slice(0, 5),
    menosVendidos: vendidos.slice(-5).reverse(),
    productos: listaProductos,
  };
}

/**
 * Embudo de la carta. Cada sesión anónima (por día) cuenta una vez en cada etapa:
 * vio la carta → abrió el detalle de un producto → lo agregó → envió el pedido con ese producto.
 */
function calcularEmbudo(f, desde, hasta) {
  const sesiones = {};
  for (const e of f.eventos) {
    if (!enRango(e.fecha, desde, hasta)) continue;
    const clave = `${claveDia(e.fecha)}|${e.sesion_id}`;
    const s = (sesiones[clave] ||= { vio: false, det: new Set(), add: new Set(), env: new Set() });
    if (e.tipo === TIPOS_EVENTO.VER_CARTA) s.vio = true;
    if (e.tipo === TIPOS_EVENTO.VER_DETALLE) s.det.add(e.producto_id);
    if (e.tipo === TIPOS_EVENTO.AGREGAR) s.add.add(e.producto_id);
    if (e.tipo === TIPOS_EVENTO.ENVIAR) s.env.add(e.producto_id);
  }
  const total = { sesiones: 0, detalle: 0, agregar: 0, enviar: 0 };
  const porProducto = Object.fromEntries(f.productos.map((p) => [p.id, [0, 0, 0]]));
  for (const s of Object.values(sesiones)) {
    if (!s.vio) continue;
    total.sesiones += 1;
    const conAgregar = [...s.det].filter((id) => s.add.has(id));
    const conEnvio = conAgregar.filter((id) => s.env.has(id));
    if (s.det.size) total.detalle += 1;
    if (conAgregar.length) total.agregar += 1;
    if (conEnvio.length) total.enviar += 1;
    s.det.forEach((id) => {
      const fila = porProducto[id];
      if (!fila) return;
      fila[0] += 1;
      if (s.add.has(id)) fila[1] += 1;
      if (s.add.has(id) && s.env.has(id)) fila[2] += 1;
    });
  }
  const etapas = [
    { etapa: 'Vio la carta', valor: total.sesiones },
    { etapa: 'Abrió el detalle de un producto', valor: total.detalle },
    { etapa: 'Agregó al pedido', valor: total.agregar },
    { etapa: 'Envió el pedido', valor: total.enviar },
  ];
  const productosEmbudo = f.productos
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
    // Los productos retirados solo aparecen si alguien los miró en el periodo
    .filter((p) => p.detalle > 0 || f.productos.find((x) => x.id === p.id)?.activo !== false)
    .sort((a, b) => b.detalle - a.detalle);
  return { etapas, productos: productosEmbudo };
}

/** GET /api/admin/dashboard -> indicadores de ventas (RF11) */
export async function getIndicadoresVentas(desde, hasta) {
  return calcularVentas(await cargarFuentes(desde, hasta), desde, hasta);
}

/** GET /api/admin/dashboard -> embudo de la carta (RF12) */
export async function getEmbudo(desde, hasta) {
  return calcularEmbudo(await cargarFuentes(desde, hasta), desde, hasta);
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
export async function getIngenieriaMenu(desde, hasta) {
  const f = await cargarFuentes(desde, hasta);
  const { productos: ventas } = calcularVentas(f, desde, hasta);
  const embudo = calcularEmbudo(f, desde, hasta);
  const conv = Object.fromEntries(embudo.productos.map((p) => [p.id, p]));
  const lista = ventas.filter((p) => p.unidades > 0);
  const totalUnidades = lista.reduce((s, p) => s + p.unidades, 0);
  const umbralPopularidad = lista.length ? 0.7 * (1 / lista.length) : 0;
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

/** Rango de fechas disponible: desde el primer dato registrado hasta hoy. */
export async function rangoDisponible() {
  const hoy = inicioDelDia(new Date());
  let primera = null;
  if (MODO_API) {
    ({ primera } = await http('/admin/dashboard/rango', { personal: true }));
  } else {
    const fechas = [
      ...leer(COLECCIONES.CUENTAS).filter((c) => c.cerrada_en).map((c) => c.cerrada_en),
      ...leer(COLECCIONES.EVENTOS).map((e) => e.fecha),
    ].sort();
    primera = fechas[0] ?? null;
  }
  const min = primera ? inicioDelDia(primera) : hoy;
  return { min: min < hoy ? min : hoy, max: hoy };
}
