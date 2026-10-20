import { useEffect, useRef } from 'react';
import styles from './CategoryTabs.module.css';

/**
 * Barra de categorías fija arriba. Resalta la categoría visible
 * (la calcula MenuPage) y al tocar una, MenuPage baja hasta su sección.
 *
 * `ref` apunta al <nav> para que MenuPage conozca su alto
 * (en React 19, ref se recibe como una prop más).
 */
export default function CategoryTabs({ categorias, activa, onSelect, ref }) {
  const listRef = useRef(null);

  // Centra la pestaña activa dentro de la barra.
  // Importante: se desplaza SOLO la lista horizontal (scrollTo sobre la lista).
  // No usar scrollIntoView aquí: también mueve la página completa y
  // eso interrumpe el scroll del usuario.
  useEffect(() => {
    const lista = listRef.current;
    const pestaña = lista?.querySelector(`[data-id="${activa}"]`);
    if (!lista || !pestaña) return;

    const destino = pestaña.offsetLeft - (lista.clientWidth - pestaña.offsetWidth) / 2;
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lista.scrollTo({ left: Math.max(0, destino), behavior: reducirMovimiento ? 'auto' : 'smooth' });
  }, [activa]);

  return (
    <nav ref={ref} className={styles.bar} aria-label="Categorías de la carta">
      <ul className={styles.list} ref={listRef}>
        {categorias.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              data-id={c.id}
              className={`${styles.tab} ${activa === c.id ? styles.active : ''}`}
              aria-current={activa === c.id ? 'true' : undefined}
              onClick={() => onSelect(c.id)}
            >
              {c.nombre}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
