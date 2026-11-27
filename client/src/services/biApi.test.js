/**
 * Pruebas unitarias de los indicadores del dashboard (RF11 y RF12).
 * Usan un conjunto pequeño de datos escrito a mano, cuyos resultados se
 * calcularon por separado, para verificar cada fórmula del dashboard.
 */
import { describe, expect, it } from 'vitest';
import {
  calcularEmbudo,
  calcularIngenieria,
  calcularVentas,
  claveDia,
  CLASIFICACION,
} from './biApi';

const f = (d, h, m = 0) => new Date(2026, 10, d, h, m).toISOString(); // noviembre de 2026, hora local

const productos = [
  { id: 1, categoria_id: 1, nombre: 'Hamburguesa El 10', precio: 9000, costo: 4000, activo: true },
  { id: 2, categoria_id: 1, nombre: 'La gringa', precio: 7000, costo: 3500, activo: true },
  { id: 3, categoria_id: 2, nombre: 'Papas fritas', precio: 3000, costo: 1000, activo: true },
  { id: 4, categoria_id: 2, nombre: 'Aros de cebolla', precio: 4000, costo: 1500, activo: true },
];
const categorias = [
  { id: 1, nombre: 'Hamburguesas' },
  { id: 2, nombre: 'Acompañamientos' },
];

const cuentas = [
  // Periodo anterior (18 y 19 de noviembre)
  { id: 10, estado: 'cerrada', total: 3000, cerrada_en: f(19, 12, 30) },
  // Periodo consultado (20 y 21 de noviembre)
  { id: 11, estado: 'cerrada', total: 18000, cerrada_en: f(20, 13, 30) },
  { id: 12, estado: 'cerrada', total: 10000, cerrada_en: f(21, 20, 0) },
];
const pedidos = [
  { id: 100, cuenta_id: 10, total: 3000, creado_en: f(19, 12), recibido_en: f(19, 12, 5),
    detalle: [{ producto_id: 3, cantidad: 1, precio_unitario: 3000 }] },
  { id: 101, cuenta_id: 11, total: 18000, creado_en: f(20, 13), recibido_en: f(20, 13, 10),
    detalle: [{ producto_id: 1, cantidad: 2, precio_unitario: 9000 }] },
  { id: 102, cuenta_id: 12, total: 10000, creado_en: f(21, 19, 30), recibido_en: f(21, 19, 50),
    detalle: [
      { producto_id: 2, cantidad: 1, precio_unitario: 7000 },
      { producto_id: 3, cantidad: 1, precio_unitario: 3000 },
    ] },
];

const ev = (sesion_id, tipo, producto_id, fecha) => ({ sesion_id, tipo, producto_id, fecha });
const eventos = [
  // Sesión 1: pide la hamburguesa; mira los aros y no los pide
  ev('s1', 'ver_carta', null, f(20, 12, 55)),
  ev('s1', 'ver_detalle', 1, f(20, 12, 56)),
  ev('s1', 'agregar', 1, f(20, 12, 57)),
  ev('s1', 'ver_detalle', 4, f(20, 12, 58)),
  ev('s1', 'enviar', 1, f(20, 13)),
  // Sesión 2: pide la gringa y papas; mira los aros y no los pide
  ev('s2', 'ver_carta', null, f(21, 19, 20)),
  ev('s2', 'ver_detalle', 2, f(21, 19, 21)),
  ev('s2', 'agregar', 2, f(21, 19, 22)),
  ev('s2', 'ver_detalle', 3, f(21, 19, 23)),
  ev('s2', 'agregar', 3, f(21, 19, 24)),
  ev('s2', 'ver_detalle', 4, f(21, 19, 25)),
  ev('s2', 'enviar', 2, f(21, 19, 30)),
  ev('s2', 'enviar', 3, f(21, 19, 30)),
  // Sesión 3: solo mira la carta
  ev('s3', 'ver_carta', null, f(21, 21)),
  // Fuera del rango: no debe contar
  ev('s9', 'ver_carta', null, f(23, 12)),
];

const fuentes = { cuentas, pedidos, eventos, productos, categorias };
const desde = new Date(2026, 10, 20);
const hasta = new Date(2026, 10, 21);

describe('Indicadores de ventas (RF11)', () => {
  const r = calcularVentas(fuentes, desde, hasta);

  it('suma solo las cuentas cerradas del periodo', () => {
    expect(r.actual.ventas).toBe(28000);
    expect(r.actual.cuentas).toBe(2);
    expect(r.actual.pedidos).toBe(2);
  });

  it('calcula el ticket promedio por cuenta', () => {
    expect(r.actual.ticket).toBe(14000);
  });

  it('calcula el tiempo promedio de entrega en minutos', () => {
    expect(r.actual.entrega).toBe(15); // (10 + 20) / 2
  });

  it('compara con el periodo anterior de igual duración', () => {
    expect(r.anterior.ventas).toBe(3000);
    expect(r.anterior.cuentas).toBe(1);
  });

  it('separa las ventas por día y por franja horaria', () => {
    expect(r.porDia.map((d) => d.ventas)).toEqual([18000, 10000]);
    const franja = Object.fromEntries(r.porFranja.map((x) => [x.franja, x.ventas]));
    expect(franja['13:00']).toBe(18000);
    expect(franja['19:00']).toBe(10000);
  });

  it('agrupa las ventas por categoría', () => {
    const cat = Object.fromEntries(r.porCategoria.map((c) => [c.nombre, c.ventas]));
    expect(cat).toEqual({ Hamburguesas: 25000, Acompañamientos: 3000 });
  });

  it('ordena los productos más vendidos y omite los que no se vendieron', () => {
    expect(r.masVendidos[0].nombre).toBe('Hamburguesa El 10');
    expect(r.masVendidos[0].unidades).toBe(2);
    expect(r.masVendidos.find((p) => p.id === 4)).toBeUndefined();
  });
});

describe('Embudo de conversión (RF12)', () => {
  const e = calcularEmbudo(fuentes, desde, hasta);

  it('cuenta cada sesión una vez por etapa y respeta el rango de fechas', () => {
    expect(e.etapas.map((x) => x.valor)).toEqual([3, 2, 2, 2]);
  });

  it('calcula la conversión por producto (enviado / detalle abierto)', () => {
    const p = Object.fromEntries(e.productos.map((x) => [x.id, x]));
    expect(p[1].conversion).toBe(1);
    expect(p[4].detalle).toBe(2);
    expect(p[4].conversion).toBe(0); // se mira, pero no se compra
  });
});

describe('Ingeniería de menú ampliada (RF12)', () => {
  const m = calcularIngenieria(fuentes, desde, hasta);
  const item = (id) => m.items.find((x) => x.id === id);

  it('usa el margen promedio ponderado por unidades', () => {
    expect(m.margenPromedio).toBe(3875); // (5000·2 + 3500 + 2000) / 4
  });

  it('clasifica según popularidad y margen (Kasavana y Smith)', () => {
    expect(item(1).clasificacion).toBe(CLASIFICACION.ESTRELLA);
    expect(item(2).clasificacion).toBe(CLASIFICACION.CABALLO);
  });

  it('no incluye productos sin ventas en la matriz', () => {
    expect(item(4)).toBeUndefined();
  });
});

describe('Fechas', () => {
  it('usa el día local para agrupar', () => {
    expect(claveDia(new Date(2026, 10, 20, 23, 59))).toBe('2026-11-20');
  });
});
