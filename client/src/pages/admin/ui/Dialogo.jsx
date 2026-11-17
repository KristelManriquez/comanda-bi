import { useEffect, useRef } from 'react';
import { IconClose } from '../../../components/Icons';
import styles from './Formulario.module.css';

/**
 * Ventana modal accesible (elemento <dialog> nativo): atrapa el foco,
 * se cierra con Escape y devuelve el foco al botón que la abrió.
 */
export default function Dialogo({ titulo, bajada, onClose, children, pie }) {
  const ref = useRef(null);
  const alCerrar = useRef(onClose);
  useEffect(() => {
    alCerrar.current = onClose;
  });
  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    const cancelar = (e) => {
      e.preventDefault();
      alCerrar.current();
    };
    d.addEventListener('cancel', cancelar);
    return () => d.removeEventListener('cancel', cancelar);
  }, []);

  return (
    <dialog ref={ref} className={styles.dialogo} aria-labelledby="dialogo-titulo">
      <div className={styles.cabecera}>
        <div>
          <h2 id="dialogo-titulo">{titulo}</h2>
          {bajada && <p>{bajada}</p>}
        </div>
        <button type="button" className={styles.cerrar} onClick={onClose}>
          <IconClose />
          <span className="visually-hidden">Cerrar</span>
        </button>
      </div>
      <div className={styles.cuerpo}>{children}</div>
      {pie && <div className={styles.pie}>{pie}</div>}
    </dialog>
  );
}

/** Campo con etiqueta y mensaje de error asociado. */
export function Campo({ etiqueta, error, ayuda, children, ancho }) {
  return (
    <label className={`${styles.campo} ${ancho === 'medio' ? styles.medio : ''}`}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      {children}
      {ayuda && !error && <small className={styles.ayuda}>{ayuda}</small>}
      {error && (
        <small className={styles.error} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

/** Casilla de verificación con descripción. */
export function Casilla({ etiqueta, descripcion, checked, onChange }) {
  return (
    <label className={styles.casilla}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{etiqueta}</strong>
        {descripcion && <small>{descripcion}</small>}
      </span>
    </label>
  );
}
