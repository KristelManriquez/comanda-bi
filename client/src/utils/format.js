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

/** Minutos transcurridos desde una fecha ISO. */
export function minutosDesde(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Fecha ISO -> "hace 5 min" */
export function haceCuanto(iso) {
  const m = minutosDesde(iso);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h ${m % 60} min`;
}

/** 1234567 -> "$1,2 M" (para ejes y tarjetas) */
export function formatCLPCorto(valor) {
  if (Math.abs(valor) >= 1_000_000) return `$${(valor / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(valor) >= 1_000) return `$${Math.round(valor / 1_000).toLocaleString('es-CL')} mil`;
  return formatCLP(valor);
}

/** 0.234 -> "23,4 %" */
export function formatPct(valor, decimales = 1) {
  return `${(valor * 100).toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`;
}
