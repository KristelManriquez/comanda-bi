import { Link } from 'react-router-dom';
import { IconBack } from './Icons';
import styles from './PageHeader.module.css';

/** Encabezado de páginas internas: volver + título + mesa. */
export default function PageHeader({ titulo, backTo, backLabel = 'Volver a la carta', mesa }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={backTo} className={styles.back} aria-label={backLabel}>
          <IconBack />
        </Link>
        <h1 className={styles.titulo}>{titulo}</h1>
        {mesa && <span className={styles.mesa}>Mesa {mesa.numero}</span>}
      </div>
    </header>
  );
}
