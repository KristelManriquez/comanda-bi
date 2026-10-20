import { Link } from 'react-router-dom';
import { textoEstado } from '../utils/pedido';
import styles from './ActiveOrderBanner.module.css';

/** Aviso en la carta cuando la mesa tiene un pedido que aún no se entrega. */
export default function ActiveOrderBanner({ pedido, to }) {
  if (!pedido) return null;
  return (
    <Link to={to} className={styles.banner}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        Pedido #{pedido.id}: <strong>{textoEstado(pedido.estado).toLowerCase()}</strong>
      </span>
      <span className={styles.cta}>Ver estado</span>
    </Link>
  );
}
