import { IconMinus, IconPlus, IconTrash } from './Icons';
import styles from './QuantityStepper.module.css';

/**
 * Selector de cantidad con botones grandes (fáciles de tocar).
 * Si allowRemove es true, en cantidad 1 el botón "−" se convierte
 * en papelera para quitar el producto.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  allowRemove = false,
  size = 'md',
  label = 'Cantidad',
}) {
  const quitara = allowRemove && value <= 1;
  return (
    <div className={`${styles.stepper} ${styles[size]}`} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(value - 1)}
        disabled={!allowRemove && value <= min}
        aria-label={quitara ? 'Quitar del pedido' : 'Disminuir cantidad'}
      >
        {quitara ? <IconTrash /> : <IconMinus />}
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
      >
        <IconPlus />
      </button>
    </div>
  );
}
