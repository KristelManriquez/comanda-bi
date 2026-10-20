import ProductImage from './ProductImage';
import { IconPlus } from './Icons';
import { formatCLP } from '../utils/format';
import styles from './ProductItem.module.css';

/**
 * Fila de producto en la carta. Toda la fila abre la ficha;
 * el botón "+" agrega una unidad directamente.
 */
export default function ProductItem({ producto, icono, enCarrito, onOpen, onQuickAdd }) {
  const agotado = !producto.disponible;

  return (
    <li className={`${styles.item} ${agotado ? styles.agotado : ''}`}>
      <button
        type="button"
        className={styles.main}
        onClick={() => onOpen(producto)}
        disabled={agotado}
        aria-label={`${producto.nombre}, ${formatCLP(producto.precio)}${agotado ? ', agotado' : ''}`}
      >
        <div className={styles.text}>
          <h3 className={styles.nombre}>{producto.nombre}</h3>
          <p className={styles.descripcion}>{producto.descripcion}</p>
          <p className={styles.precio}>
            {agotado ? <span className={styles.badgeAgotado}>Agotado por hoy</span> : formatCLP(producto.precio)}
          </p>
        </div>
        <ProductImage producto={producto} icono={icono} />
      </button>

      {!agotado && (
        <button
          type="button"
          className={`${styles.add} ${enCarrito > 0 ? styles.addCount : ''}`}
          onClick={() => onQuickAdd(producto)}
          aria-label={
            enCarrito > 0
              ? `Agregar otro ${producto.nombre}. Llevas ${enCarrito}`
              : `Agregar ${producto.nombre} al pedido`
          }
        >
          {enCarrito > 0 ? enCarrito : <IconPlus />}
        </button>
      )}
    </li>
  );
}
