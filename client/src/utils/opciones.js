/**
 * Opción obligatoria de un producto: la marca de la bebida en lata, el sabor
 * del jugo, etc. Un producto la tiene cuando su lista `opciones` no está vacía;
 * `opcion_titulo` es lo que se le pregunta al comensal ("Marca", "Sabor").
 *
 * El servidor repite estas mismas reglas (server/src/services/pedidos.js y
 * admin.js): el navegador no es la única barrera.
 */

export const MAX_OPCIONES = 10;
export const LARGO_OPCION = 30;

export const requiereOpcion = (producto) => (producto?.opciones?.length ?? 0) > 0;

/** "Marca" -> "marca", para usarlo dentro de una frase. */
export const tituloOpcion = (producto) => (producto?.opcion_titulo || 'opción').toLowerCase();

/** "la marca", "el sabor": artículo según la última letra (basta para títulos cortos). */
export const conArticulo = (producto) => {
  const t = tituloOpcion(producto);
  return `${t.endsWith('a') ? 'la' : 'el'} ${t}`;
};

/**
 * Valida la opción elegida para un producto. Devuelve la opción tal como está
 * escrita en la carta ('' si el producto no tiene opciones) o lanza un error.
 */
export function validarOpcion(producto, opcion) {
  if (!requiereOpcion(producto)) return '';
  const elegida = producto.opciones.find((o) => o === String(opcion ?? '').trim());
  if (!elegida) throw new Error(`Elige ${conArticulo(producto)} de ${producto.nombre}`);
  return elegida;
}

/**
 * Normaliza lo que escribe el administrador: un título y una lista de opciones
 * (separadas por coma o en un arreglo). Devuelve { opcion_titulo, opciones }
 * o lanza un error con el campo del formulario al que se refiere.
 */
export function normalizarOpciones(titulo, opciones) {
  const t = String(titulo ?? '').trim();
  const lista = (Array.isArray(opciones) ? opciones : String(opciones ?? '').split(','))
    .map((o) => String(o).trim())
    .filter(Boolean);
  const error = (mensaje, campo) => Object.assign(new Error(mensaje), { campo });

  if (!t && lista.length === 0) return { opcion_titulo: '', opciones: [] };
  if (!t) throw error('Escribe qué debe elegir el comensal (por ejemplo, Marca o Sabor)', 'opcion_titulo');
  if (t.length > LARGO_OPCION) throw error(`El título puede tener hasta ${LARGO_OPCION} caracteres`, 'opcion_titulo');
  if (lista.length < 2) throw error('Escribe al menos dos opciones, separadas por coma', 'opciones');
  if (lista.length > MAX_OPCIONES) throw error(`Puedes escribir hasta ${MAX_OPCIONES} opciones`, 'opciones');
  if (lista.some((o) => o.length > LARGO_OPCION)) throw error(`Cada opción puede tener hasta ${LARGO_OPCION} caracteres`, 'opciones');
  const unicas = new Set(lista.map((o) => o.toLowerCase()));
  if (unicas.size !== lista.length) throw error('Hay opciones repetidas', 'opciones');
  return { opcion_titulo: t, opciones: lista };
}
