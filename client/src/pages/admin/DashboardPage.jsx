import { useEffect, useMemo, useState } from 'react';
import { getEmbudo, getIndicadoresVentas, getIngenieriaMenu, inicioDelDia, rangoDisponible } from '../../services/biApi';
import { suscribir } from '../../services/store';
import VentasTab from './bi/VentasTab';
import EmbudoTab from './bi/EmbudoTab';
import IngenieriaTab from './bi/IngenieriaTab';
import a from './Admin.module.css';
import styles from './bi/Bi.module.css';

const PRESETS = [
  { id: 7, texto: '7 días' },
  { id: 30, texto: '30 días' },
  { id: 84, texto: '12 semanas' },
];

const TABS = [
  { id: 'ventas', texto: 'Ventas' },
  { id: 'embudo', texto: 'Embudo de la carta' },
  { id: 'menu', texto: 'Ingeniería de menú' },
];

const aInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deInput = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Dashboard de inteligencia de negocio (OE3): ventas, embudo e ingeniería de menú. */
export default function DashboardPage() {
  const limites = useMemo(() => rangoDisponible(), []);
  const hoy = limites.max;
  const [preset, setPreset] = useState(30);
  const [rango, setRango] = useState(() => ({ desde: new Date(hoy.getTime() - 29 * 86400000), hasta: hoy }));
  const [tab, setTab] = useState('ventas');
  const [version, setVersion] = useState(0);

  // Recalcula al cerrar cuentas o registrar eventos en otras pestañas
  useEffect(() => suscribir(() => setVersion((v) => v + 1)), []);

  const elegirPreset = (dias) => {
    setPreset(dias);
    setRango({ desde: new Date(hoy.getTime() - (dias - 1) * 86400000), hasta: hoy });
  };
  const cambiarFecha = (campo, valor) => {
    if (!valor) return;
    setPreset(null);
    setRango((r) => {
      const nuevo = { ...r, [campo]: inicioDelDia(deInput(valor)) };
      return nuevo.desde > nuevo.hasta ? r : nuevo;
    });
  };

  const datos = useMemo(() => {
    // eslint-disable-next-line no-unused-expressions
    version;
    if (tab === 'ventas') return getIndicadoresVentas(rango.desde, rango.hasta);
    if (tab === 'embudo') return getEmbudo(rango.desde, rango.hasta);
    return getIngenieriaMenu(rango.desde, rango.hasta);
  }, [tab, rango, version]);

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Dashboard</h1>
          <p className={a.bajada}>
            El 10 · 12 semanas de eventos simulados más los pedidos registrados hoy en la aplicación.
          </p>
        </div>
      </header>

      <div className={styles.filtros}>
        <div className={styles.segmentado} role="group" aria-label="Periodo">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => elegirPreset(p.id)}>
              {p.texto}
            </button>
          ))}
        </div>
        <label className={styles.fecha}>
          Desde
          <input
            type="date"
            value={aInput(rango.desde)}
            min={aInput(limites.min)}
            max={aInput(rango.hasta)}
            onChange={(e) => cambiarFecha('desde', e.target.value)}
          />
        </label>
        <label className={styles.fecha}>
          Hasta
          <input
            type="date"
            value={aInput(rango.hasta)}
            min={aInput(rango.desde)}
            max={aInput(limites.max)}
            onChange={(e) => cambiarFecha('hasta', e.target.value)}
          />
        </label>
      </div>

      <nav className={styles.tabs} aria-label="Secciones del dashboard">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.texto}
          </button>
        ))}
      </nav>

      {tab === 'ventas' && <VentasTab datos={datos} />}
      {tab === 'embudo' && <EmbudoTab key={`${rango.desde}-${rango.hasta}`} embudo={datos} />}
      {tab === 'menu' && <IngenieriaTab matriz={datos} />}
    </>
  );
}
