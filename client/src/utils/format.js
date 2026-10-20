const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** 12990 -> "$12.990" */
export function formatCLP(valor) {
  return clp.format(valor);
}

/** Fecha ISO -> "21:14" */
export function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}
