import { useEffect, useState } from 'react';
import { getEmbudo, getIndicadoresVentas, getIngenieriaMenu, inicioDelDia, rangoDisponible } from '../../services/biApi';
import { suscribir } from '../../services/tiempoReal';
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
  const hoy = inicioDelDia(new Date());
  const [limites, setLimites] = useState({ min: hoy, max: hoy });
  const [preset, setPreset] = useState(30);
  const [rango, setRango] = useState(() => ({ desde: new Date(hoy.getTime() - 29 * 86400000), hasta: hoy }));
  const [tab, setTab] = useState('ventas');
  const [version, setVersion] = useState(0);

  // Recalcula cuando llegan pedidos o se cierran cuentas (Socket.IO o, en la demo, otras pestañas)
  useEffect(() => suscribir(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    rangoDisponible()
      .then(setLimites)
      .catch(() => {});
  }, [version]);

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

  const [resultado, setResultado] = useState({ clave: null, datos: null, error: null });
  const clave = `${tab}|${rango.desde.getTime()}|${rango.hasta.getTime()}`;

  useEffect(() => {
    let vigente = true;
    const calcular =
      tab === 'ventas' ? getIndicadoresVentas : tab === 'embudo' ? getEmbudo : getIngenieriaMenu;
    calcular(rango.desde, rango.hasta)
      .then((datos) => vigente && setResultado({ clave, datos, error: null }))
      .catch((error) => vigente && setResultado({ clave, datos: null, error: error.message }));
    return () => {
      vigente = false;
    };
  }, [tab, rango, version, clave]);

  // Mientras llegan los datos de otra pestaña o rango no se muestran los anteriores
  const datos = resultado.clave === clave ? resultado.datos : null;

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Dashboard</h1>
          <p className={a.bajada}>
            El 10 · control de tu negocio
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

      {resultado.error && resultado.clave === clave && (
        <p className={a.bajada} role="alert">
          No se pudieron cargar los indicadores: {resultado.error}
        </p>
      )}
      {!datos && !resultado.error && <p className={a.bajada}>Cargando indicadores…</p>}
      {datos && tab === 'ventas' && <VentasTab datos={datos} />}
      {datos && tab === 'embudo' && <EmbudoTab key={clave} embudo={datos} />}
      {datos && tab === 'menu' && <IngenieriaTab matriz={datos} />}
    </>
  );
}
