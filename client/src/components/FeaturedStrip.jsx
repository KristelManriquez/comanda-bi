import ProductImage from './ProductImage';
import { formatCLP } from '../utils/format';
import styles from './FeaturedStrip.module.css';

/**
 * Carrusel horizontal de productos destacados.
 * Hoy usa el campo "destacado"; cuando exista el módulo de BI,
 * puede alimentarse con los productos más vendidos de la semana.
 */
export default function FeaturedStrip({ productos, iconoDe, onOpen }) {
  if (productos.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="destacados-title">
      <h2 id="destacados-title" className={styles.title}>
        Lo más pedido
      </h2>
      <ul className={styles.strip}>
        {productos.map((p) => (
          <li key={p.id}>
            <button type="button" className={styles.card} onClick={() => onOpen(p)}>
              <ProductImage producto={p} icono={iconoDe(p)} size="md" />
              <span className={styles.nombre}>{p.nombre}</span>
              <span className={styles.precio}>{formatCLP(p.precio)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
