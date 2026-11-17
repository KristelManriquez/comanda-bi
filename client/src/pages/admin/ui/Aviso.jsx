import styles from '../AdminPages.module.css';

export default function Aviso({ aviso }) {
  return (
    <div role="status" aria-live="polite">
      {aviso && (
        <p key={aviso.id} className={`${styles.aviso} ${aviso.esError ? styles.avisoError : ''}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
