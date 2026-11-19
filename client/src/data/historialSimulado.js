/**
 * Historial simulado de 12 semanas de eventos de El 10, para que el
 * dashboard tenga datos con sentido mientras El 10 no cuenta con un
 * historial de ventas propio (riesgo R3).
 *
 * Incluye a propósito productos con alto interés y baja conversión
 * (Veggie y Papas cheddar y tocino), para verificar que el embudo y
 * la ingeniería de menú los identifiquen (OE4).
 *
 * Se genera de forma determinista (semilla fija), simulando sesiones
 * anónimas de comensales: cada sesión ve la carta, abre el detalle de
 * algunos productos, agrega otros y a veces envía el pedido. Así, las
 * ventas y el embudo de conversión salen de un mismo comportamiento.
 *
 * Resultado:
 *   cuentas: [{ id, mesa_id, abierta_en, cerrada_en, total, garzon_id }]
 *   pedidos: [{ id, cuenta_id, creado_en, recibido_en, detalle: [{ producto_id, cantidad, precio_unitario }] }]
 *   embudoDiario: { 'AAAA-MM-DD': { sesiones, detalle, agregar, enviar, productos: { id: [detalle, agregar, enviar] } } }
 */

import { productos } from './mockData';

export const SEMANAS_HISTORIAL = 12;

/* Comportamiento de los comensales frente a cada producto:
   det   = probabilidad de abrir su detalle en una sesión
   add   = probabilidad de agregarlo después de ver el detalle
   quick = probabilidad de agregarlo directo desde la lista */
const COMPORTAMIENTO = {
  101: { det: 0.32, add: 0.7, quick: 0.12 },
  102: { det: 0.26, add: 0.62, quick: 0.08 },
  103: { det: 0.14, add: 0.6, quick: 0.08 },
  104: { det: 0.16, add: 0.5, quick: 0.05 },
  105: { det: 0.14, add: 0.55, quick: 0.05 },
  106: { det: 0.24, add: 0.14, quick: 0.01 }, // mucho interés, pocos pedidos
  201: { det: 0.28, add: 0.68, quick: 0.1 },
  202: { det: 0.18, add: 0.6, quick: 0.06 },
  203: { det: 0.14, add: 0.55, quick: 0.05 },
  301: { det: 0.1, add: 0.7, quick: 0.35 },
  302: { det: 0.22, add: 0.18, quick: 0.02 }, // mucho interés, pocos pedidos
  303: { det: 0.08, add: 0.5, quick: 0.05 },
  304: { det: 0.1, add: 0.55, quick: 0.06 },
  401: { det: 0.08, add: 0.5, quick: 0.04 },
  402: { det: 0.07, add: 0.45, quick: 0.04 },
  501: { det: 0.05, add: 0.6, quick: 0.4 },
  502: { det: 0.03, add: 0.5, quick: 0.1 },
  503: { det: 0.08, add: 0.5, quick: 0.1 },
};

// Cuentas por día según el día de la semana (domingo = 0).
// El 10 atiende solo en eventos: viernes, sábado y domingo.
const CUENTAS_POR_DIA = [34, 0, 0, 0, 0, 22, 40];

function generador(semilla) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const claveDia = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let cache = null;

export function getHistorialSimulado() {
  if (cache) return cache;
  const rnd = generador(20261026);
  const entre = (a, b) => a + rnd() * (b - a);
  const entero = (a, b) => Math.floor(entre(a, b + 1));

  const cuentas = [];
  const pedidos = [];
  const embudoDiario = {};

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = SEMANAS_HISTORIAL * 7;

  const ahora = Date.now();
  // Incluye el día de hoy hasta la hora actual
  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() - i);
    const clave = claveDia(dia);
    const resumen = { sesiones: 0, detalle: 0, agregar: 0, enviar: 0, productos: {} };
    embudoDiario[clave] = resumen;

    // leve crecimiento a lo largo de las 12 semanas
    const tendencia = 0.88 + (0.24 * (dias - i)) / dias;
    const nCuentas = Math.round(CUENTAS_POR_DIA[dia.getDay()] * tendencia * entre(0.85, 1.15));
    const finde = dia.getDay() === 0 || dia.getDay() === 6;

    for (let c = 0; c < nCuentas; c++) {
      const almuerzo = rnd() < (finde ? 0.5 : 0.42);
      const inicio = new Date(dia);
      inicio.setMinutes(almuerzo ? entero(12 * 60 + 30, 15 * 60) : entero(19 * 60, 22 * 60 + 30));
      const punta = !almuerzo && (dia.getDay() === 5 || dia.getDay() === 6);

      const cuenta = {
        id: 10000 + cuentas.length,
        mesa_id: entero(1, 5),
        abierta_en: inicio.toISOString(),
        cerrada_en: null,
        total: 0,
        garzon_id: 1, // el administrador atiende las mesas
      };
      const sesiones = rnd() < 0.6 ? 1 : 2;
      let ultimo = inicio.getTime();

      for (let s = 0; s < sesiones; s++) {
        resumen.sesiones += 1;
        const carrito = [];
        let vioDetalle = false;
        let agregoTrasDetalle = false;
        const tocados = [];

        for (const p of productos) {
          const b = COMPORTAMIENTO[p.id];
          if (rnd() < b.det) {
            vioDetalle = true;
            const fila = (resumen.productos[p.id] ||= [0, 0, 0]);
            fila[0] += 1;
            if (rnd() < b.add) {
              fila[1] += 1;
              agregoTrasDetalle = true;
              tocados.push(p.id);
              carrito.push(p);
            }
          } else if (rnd() < b.quick) {
            carrito.push(p);
          }
        }
        if (vioDetalle) resumen.detalle += 1;
        if (vioDetalle && agregoTrasDetalle) resumen.agregar += 1;

        const envia = carrito.length > 0 && rnd() < 0.92;
        if (!envia) continue;
        if (vioDetalle && agregoTrasDetalle) resumen.enviar += 1;
        tocados.forEach((id) => (resumen.productos[id][2] += 1));

        const creado = ultimo + (s === 0 ? entero(4, 12) : entero(18, 40)) * 60000;
        const entrega = entero(punta ? 12 : 8, punta ? 26 : 19) * 60000;
        const detalle = carrito.map((p) => ({
          producto_id: p.id,
          cantidad: p.categoria_id >= 5 && rnd() < 0.45 ? 2 : 1,
          precio_unitario: p.precio,
        }));
        const pedido = {
          id: 100000 + pedidos.length,
          cuenta_id: cuenta.id,
          creado_en: new Date(creado).toISOString(),
          recibido_en: new Date(creado + entrega).toISOString(),
          detalle,
          total: detalle.reduce((t, d) => t + d.cantidad * d.precio_unitario, 0),
        };
        pedidos.push(pedido);
        cuenta.total += pedido.total;
        ultimo = creado + entrega;
      }

      const cierre = ultimo + entero(20, 45) * 60000;
      if (cuenta.total > 0 && cierre <= ahora) {
        cuenta.cerrada_en = new Date(cierre).toISOString();
        cuentas.push(cuenta);
      }
    }
  }

  cache = { cuentas, pedidos, embudoDiario };
  return cache;
}
