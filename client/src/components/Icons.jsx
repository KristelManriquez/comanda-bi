/**
 * Íconos SVG propios (sin dependencias externas).
 * Los de categoría sirven como imagen provisoria mientras
 * los productos no tengan foto (imagen_url = null).
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...base} strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...base} strokeWidth={2.4} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconBack(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...base} strokeWidth={2.2} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...base} strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...props}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...base} strokeWidth={2.8} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconPin(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...base} {...props}>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconBag(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...base} {...props}>
      <path d="M5 8h14l-1.2 11.5H6.2L5 8z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

/* ---------- Íconos de categoría ---------- */

const categorias = {
  empanada: (
    <>
      <path d="M8 38c0-12 10-22 24-22s24 10 24 22H8z" />
      <path d="M8 38c3 3 6 3 8 0 2 3 6 3 8 0 2 3 6 3 8 0 2 3 6 3 8 0 2 3 6 3 8 0 2 3 5 3 8 0" />
      <path d="M24 27c2 2 4 2 6 0M34 27c2 2 4 2 6 0" />
    </>
  ),
  plato: (
    <>
      <circle cx="32" cy="34" r="20" />
      <circle cx="32" cy="34" r="12" />
      <path d="M6 12v10a4 4 0 0 0 4 4v26M10 12v8M14 12v10a4 4 0 0 1-4 4" />
      <path d="M58 12c-4 2-5 7-5 13h5v27" />
    </>
  ),
  sandwich: (
    <>
      <path d="M10 28c0-8 10-14 22-14s22 6 22 14H10z" />
      <path d="M8 34c4 2 8-2 12 0s8-2 12 0 8-2 12 0 8-2 12 0" />
      <path d="M10 40h44M12 46h40c0 4-4 6-8 6H20c-4 0-8-2-8-6z" />
    </>
  ),
  postre: (
    <>
      <path d="M14 30h36l-4 22H18l-4-22z" />
      <path d="M14 30c0-8 8-14 18-14s18 6 18 14" />
      <path d="M32 16v-6M28 10h8" />
      <path d="M22 38h20" />
    </>
  ),
  vaso: (
    <>
      <path d="M18 12h28l-4 42H22l-4-42z" />
      <path d="M19.5 26h25" />
      <path d="M36 12l6-6" />
    </>
  ),
  copa: (
    <>
      <path d="M18 10h28c0 12-6 20-14 20s-14-8-14-20z" />
      <path d="M32 30v20M22 54h20" />
      <path d="M19 17h26" />
    </>
  ),
};

export function CategoryIcon({ name, size = 40, ...props }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      strokeWidth={2.4}
      {...props}
    >
      {categorias[name] ?? categorias.plato}
    </svg>
  );
}
