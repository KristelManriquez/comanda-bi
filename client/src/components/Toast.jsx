import { IconCheck } from './Icons';
import styles from './Toast.module.css';

/** Confirmación breve, anunciada también a lectores de pantalla. */
export default function Toast({ mensaje, conCarrito }) {
  return (
    <div className={`${styles.zone} ${conCarrito ? styles.raised : ''}`} role="status" aria-live="polite">
      {mensaje && (
        <div key={mensaje.id} className={styles.toast}>
          <span className={styles.icon}>
            <IconCheck />
          </span>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
