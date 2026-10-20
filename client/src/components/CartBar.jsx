import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCLP } from '../utils/format';
import styles from './CartBar.module.css';

/** Barra flotante inferior que lleva al carrito. Solo aparece con productos. */
export default function CartBar({ to }) {
  const { cantidadTotal, total } = useCart();
  const [bump, setBump] = useState(false);
  const prev = useRef(cantidadTotal);

  // Pequeño "salto" del contador cuando se agrega algo
  useEffect(() => {
    if (cantidadTotal > prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      prev.current = cantidadTotal;
      return () => clearTimeout(t);
    }
    prev.current = cantidadTotal;
  }, [cantidadTotal]);

  if (cantidadTotal === 0) return null;

  return (
    <div className={styles.wrap}>
      <Link to={to} className={styles.bar}>
        <span className={`${styles.count} ${bump ? styles.bump : ''}`}>{cantidadTotal}</span>
        <span className={styles.label}>Ver mi pedido</span>
        <span className={styles.total}>{formatCLP(total)}</span>
      </Link>
    </div>
  );
}
