import { useEffect, useRef, useState } from 'react';
import ProductImage from './ProductImage';
import QuantityStepper from './QuantityStepper';
import { IconClose } from './Icons';
import { formatCLP } from '../utils/format';
import { conArticulo, requiereOpcion } from '../utils/opciones';
import styles from './ProductSheet.module.css';

/**
 * Ficha del producto como "bottom sheet" (panel que sube desde abajo),
 * el patrón más cómodo para usar con el pulgar en el teléfono.
 * Usa <dialog> nativo: bloquea el fondo, cierra con Esc y maneja el foco.
 */
export default function ProductSheet({ producto, icono, onClose, onAdd }) {
  const dialogRef = useRef(null);
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [opcion, setOpcion] = useState('');
  const [faltaOpcion, setFaltaOpcion] = useState(false);
  const opcionesRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (producto && dialog && !dialog.open) {
      setCantidad(1);
      setNota('');
      setOpcion('');
      setFaltaOpcion(false);
      dialog.showModal();
    }
  }, [producto]);

  const cerrar = () => {
    dialogRef.current?.close();
  };

  // Cerrar al tocar el fondo oscuro
  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) cerrar();
  };

  const conOpciones = requiereOpcion(producto);

  // Sin la opción elegida (marca, sabor) no se agrega: se avisa junto a las opciones
  const agregar = () => {
    if (conOpciones && !opcion) {
      setFaltaOpcion(true);
      opcionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      opcionesRef.current?.querySelector('input')?.focus({ preventScroll: true });
      return;
    }
    onAdd(producto, cantidad, nota, opcion);
    cerrar();
  };

  const elegir = (valor) => {
    setOpcion(valor);
    setFaltaOpcion(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      onClose={onClose}
      onClick={onBackdropClick}
      aria-labelledby="sheet-title"
    >
      {producto && (
        <div className={styles.content}>
          <div className={styles.media}>
            <ProductImage producto={producto} icono={icono} size="lg" />
            <button type="button" className={styles.close} onClick={cerrar} aria-label="Cerrar">
              <IconClose />
            </button>
          </div>

          <div className={styles.body}>
            <h2 id="sheet-title" className={styles.nombre}>
              {producto.nombre}
            </h2>
            <p className={styles.descripcion}>{producto.descripcion}</p>
            <p className={styles.precio}>{formatCLP(producto.precio)}</p>

            {conOpciones && (
              <fieldset
                ref={opcionesRef}
                className={`${styles.opciones} ${faltaOpcion ? styles.opcionesError : ''}`}
                aria-describedby={faltaOpcion ? 'opcion-error' : undefined}
              >
                <legend className={styles.opcionesTitulo}>
                  {producto.opcion_titulo} <span className={styles.obligatorio}>Obligatorio</span>
                </legend>
                <div className={styles.chips}>
                  {producto.opciones.map((o) => (
                    <label key={o} className={`${styles.chip} ${opcion === o ? styles.chipActivo : ''}`}>
                      <input
                        type="radio"
                        name="opcion"
                        value={o}
                        checked={opcion === o}
                        onChange={() => elegir(o)}
                        required
                      />
                      {o}
                    </label>
                  ))}
                </div>
                {faltaOpcion && (
                  <p id="opcion-error" className={styles.opcionError} role="alert">
                    Elige {conArticulo(producto)} para agregarlo a tu pedido.
                  </p>
                )}
              </fieldset>
            )}

            <label className={styles.notaLabel} htmlFor="nota">
              Nota para la cocina <span>(opcional)</span>
            </label>
            <textarea
              id="nota"
              className={styles.nota}
              rows={2}
              maxLength={140}
              placeholder="Ej: sin cebolla, bien cocido"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className={styles.footer}>
            <QuantityStepper value={cantidad} onChange={setCantidad} />
            <button type="button" className={`btn-primary ${styles.addBtn}`} onClick={agregar}>
              <span>Agregar</span>
              <span>{formatCLP(producto.precio * cantidad)}</span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
