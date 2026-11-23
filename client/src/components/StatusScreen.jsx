import styles from './StatusScreen.module.css';

/** Pantalla completa para estados de carga y error. */
export default function StatusScreen({ titulo, texto, cargando = false, children }) {
  return (
    <main className={styles.screen} aria-busy={cargando}>
      <div className={styles.mark} aria-hidden="true">
        El 10
      </div>
      {cargando && <div className={styles.spinner} aria-hidden="true" />}
      <h1 className={styles.titulo}>{titulo}</h1>
      {texto && <p className={styles.texto}>{texto}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </main>
  );
}
