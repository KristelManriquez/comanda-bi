/** Parámetros visuales comunes de los gráficos del dashboard (Recharts). */
export const COLOR = {
  serie: '#5f1ac6', // violeta de la marca, aclarado un paso para que los gráficos cumplan la banda de luminosidad
  serieSuave: '#eee8f8',
  alerta: '#eb6834', // segunda identidad (validada con el violeta: ΔE CVD 32,6)
  grilla: '#ebe5f1',
  eje: '#776d84',
  tinta: '#1d1029',
  superficie: '#ffffff',
};

export const TICK = { fill: COLOR.eje, fontSize: 12, fontFamily: 'inherit' };
export const MARGEN = { top: 8, right: 8, bottom: 0, left: 0 };
