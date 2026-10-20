import { IconClock, IconPin } from './Icons';
import styles from './MenuHeader.module.css';

export default function MenuHeader({ restaurante, mesa }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <span className={styles.welcome}>Bienvenido a</span>
          <span className={styles.mesa} aria-label={`Estás en la mesa ${mesa.numero}`}>
            Mesa <strong>{mesa.numero}</strong>
          </span>
        </div>

        <h1 className={styles.wordmark}>{restaurante.nombre.toLowerCase()}</h1>
        <p className={styles.bajada}>{restaurante.bajada}</p>

        <ul className={styles.info}>
          <li>
            <IconPin /> {restaurante.direccion}
          </li>
          <li>
            <IconClock /> {restaurante.horario}
          </li>
        </ul>
      </div>
    </header>
  );
}
