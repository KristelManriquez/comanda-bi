/**
 * Almacenamiento simulado de la operación del restaurante.
 *
 * Mientras no exista el backend, los pedidos, cuentas, historial de
 * estados y eventos de navegación se guardan en localStorage. Así, la
 * vista del comensal, la de cocina, la del garzón y el dashboard pueden
 * abrirse en pestañas distintas del mismo navegador y ver los mismos datos.
 *
 * suscribir() reemplaza, por ahora, a Socket.IO: avisa cuando otra
 * pestaña (evento "storage") o la misma pestaña cambia los datos.
 */

const PREFIJO = 'fork:v2:';
const EVENTO_CAMBIO = 'fork:cambio';

export const COLECCIONES = {
  // Operación del día
  PEDIDOS: 'pedidos',
  CUENTAS: 'cuentas',
  HISTORIAL: 'historial',
  EVENTOS: 'eventos',
  // Catálogo que administra el restaurante (RF09 y RF10)
  CATEGORIAS: 'categorias',
  PRODUCTOS: 'productos',
  MESAS: 'mesas',
  USUARIOS: 'usuarios',
};

const OPERACION = [COLECCIONES.PEDIDOS, COLECCIONES.CUENTAS, COLECCIONES.HISTORIAL, COLECCIONES.EVENTOS];

const memoria = {};

export function leer(coleccion, porDefecto = []) {
  try {
    const raw = localStorage.getItem(PREFIJO + coleccion);
    return raw ? JSON.parse(raw) : porDefecto;
  } catch {
    return memoria[coleccion] ?? porDefecto;
  }
}

export function escribir(coleccion, valor) {
  memoria[coleccion] = valor;
  try {
    localStorage.setItem(PREFIJO + coleccion, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: los datos viven solo en memoria */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: coleccion }));
}

/** Siguiente id correlativo de una colección (como un SERIAL de PostgreSQL). */
export function siguienteId(lista, base = 0) {
  return lista.reduce((max, x) => Math.max(max, x.id), base) + 1;
}

/** Llama a `callback` cada vez que cambian los datos. Devuelve la función para desuscribirse. */
export function suscribir(callback) {
  const enOtraPestana = (e) => {
    if (!e.key || e.key.startsWith(PREFIJO)) callback();
  };
  window.addEventListener('storage', enOtraPestana);
  window.addEventListener(EVENTO_CAMBIO, callback);
  return () => {
    window.removeEventListener('storage', enOtraPestana);
    window.removeEventListener(EVENTO_CAMBIO, callback);
  };
}

function borrar(colecciones) {
  colecciones.forEach((c) => {
    delete memoria[c];
    try {
      localStorage.removeItem(PREFIJO + c);
    } catch {
      /* nada que borrar */
    }
  });
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: '*' }));
}

/** Borra pedidos, cuentas, historial y eventos; mantiene la carta, las mesas y los usuarios. */
export function reiniciarOperacion() {
  borrar(OPERACION);
}

/** Vuelve todo a los datos iniciales de Fork, incluido el catálogo. */
export function reiniciar() {
  borrar([...Object.values(COLECCIONES), 'disponibilidad']);
}
