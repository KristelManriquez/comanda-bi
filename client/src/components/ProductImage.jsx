import { CategoryIcon } from './Icons';
import styles from './ProductImage.module.css';

/**
 * Muestra la foto del producto o, si aún no tiene,
 * un recuadro con el ícono de su categoría.
 */
export default function ProductImage({ producto, icono, size = 'md' }) {
  const iconSize = { sm: 32, md: 40, lg: 72 }[size];
  return (
    <div className={`${styles.tile} ${styles[size]}`}>
      {producto.imagen_url ? (
        <img src={producto.imagen_url} alt="" loading="lazy" className={styles.img} />
      ) : (
        <CategoryIcon name={icono} size={iconSize} className={styles.icon} />
      )}
    </div>
  );
}
