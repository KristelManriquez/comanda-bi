import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

/**
 * Carrito del comensal.
 * - Se guarda por mesa en localStorage, así no se pierde si el
 *   comensal recarga la página o bloquea el teléfono.
 * - Una "línea" es producto + nota: dos empanadas "sin aceituna" y
 *   una normal son dos líneas distintas, porque cocina las prepara distinto.
 */

const CartContext = createContext(null);

const claveLinea = (productoId, nota = '') => `${productoId}::${nota.trim().toLowerCase()}`;

function cartReducer(state, action) {
  switch (action.type) {
    case 'agregar': {
      const { producto, cantidad, nota = '' } = action;
      const key = claveLinea(producto.id, nota);
      const existe = state.find((l) => l.key === key);
      if (existe) {
        return state.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad + cantidad } : l));
      }
      return [
        ...state,
        {
          key,
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          categoria_id: producto.categoria_id,
          cantidad,
          nota: nota.trim(),
        },
      ];
    }
    case 'cambiarCantidad':
      return state
        .map((l) => (l.key === action.key ? { ...l, cantidad: action.cantidad } : l))
        .filter((l) => l.cantidad > 0);
    case 'quitar':
      return state.filter((l) => l.key !== action.key);
    case 'vaciar':
      return [];
    default:
      return state;
  }
}

function leerCarrito(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ tokenMesa, children }) {
  const storageKey = `fork:carrito:${tokenMesa}`;
  const [lineas, dispatch] = useReducer(cartReducer, storageKey, leerCarrito);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(lineas));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [lineas, storageKey]);

  const value = useMemo(() => {
    const cantidadTotal = lineas.reduce((s, l) => s + l.cantidad, 0);
    const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
    return {
      lineas,
      cantidadTotal,
      total,
      agregar: (producto, cantidad = 1, nota = '') =>
        dispatch({ type: 'agregar', producto, cantidad, nota }),
      cambiarCantidad: (key, cantidad) => dispatch({ type: 'cambiarCantidad', key, cantidad }),
      quitar: (key) => dispatch({ type: 'quitar', key }),
      vaciar: () => dispatch({ type: 'vaciar' }),
      cantidadDeProducto: (productoId) =>
        lineas.filter((l) => l.producto_id === productoId).reduce((s, l) => s + l.cantidad, 0),
    };
  }, [lineas]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
