import styles from './Bi.module.css';

/** Tooltip común de los gráficos: título + filas valor (texto en tinta, no en color de serie). */
export default function ChartTooltip({ active, payload, label, titulo, filas }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitulo}>{titulo ? titulo(datum, label) : label}</p>
      {filas(datum).map(([k, v]) => (
        <p key={k} className={styles.tooltipFila}>
          <span>{k}</span>
          <strong>{v}</strong>
        </p>
      ))}
    </div>
  );
}
