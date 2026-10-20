import { useEffect, useRef } from 'react';
import styles from './CategoryTabs.module.css';

/**
 * Barra de categorías fija arriba. Resalta la categoría visible
 * (la calcula MenuPage) y al tocar una, baja hasta su sección.
 */
export default function CategoryTabs({ categorias, activa, onSelect }) {
  const listRef = useRef(null);

  // Mantiene la pestaña activa visible dentro de la barra horizontal.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-id="${activa}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activa]);

  return (
    <nav className={styles.bar} aria-label="Categorías de la carta">
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
