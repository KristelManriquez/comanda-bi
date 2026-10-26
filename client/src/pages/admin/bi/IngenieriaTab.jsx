import {
  CartesianGrid,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ACCION, CLASIFICACION } from '../../../services/biApi';
import { formatCLP, formatPct } from '../../../utils/format';
import ChartTooltip from './ChartTooltip';
import { COLOR, TICK } from './chartTheme';
import a from '../Admin.module.css';
import styles from './Bi.module.css';

/** Etiqueta directa en una sola línea, a la derecha del punto. */
function EtiquetaPunto({ x, y, value }) {
  return (
    <text x={x + 14} y={y + 4} fill={COLOR.tinta} fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
}

const ORDEN = [CLASIFICACION.ESTRELLA, CLASIFICACION.CABALLO, CLASIFICACION.ROMPECABEZAS, CLASIFICACION.PERRO];
const DESCRIPCION = {
  [CLASIFICACION.ESTRELLA]: 'Populares y rentables',
  [CLASIFICACION.CABALLO]: 'Populares, poco margen',
  [CLASIFICACION.ROMPECABEZAS]: 'Rentables, poco pedidos',
  [CLASIFICACION.PERRO]: 'Poco pedidos y poco margen',
};

/** Matriz de ingeniería de menú (Kasavana y Smith, 1982) ampliada con la conversión del embudo. */
export default function IngenieriaTab({ matriz }) {
  const normales = matriz.items.filter((p) => !p.alerta);
  const alertas = matriz.items.filter((p) => p.alerta);
  const conteo = Object.fromEntries(ORDEN.map((c) => [c, matriz.items.filter((p) => p.clasificacion === c).length]));
  const tooltip = (
    <ChartTooltip
      titulo={(d) => d.nombre}
      filas={(d) => [
        ['Clasificación', d.clasificacion],
        ['Unidades vendidas', d.unidades.toLocaleString('es-CL')],
        ['Margen unitario', formatCLP(d.margen)],
        ['Conversión del detalle', formatPct(d.conversion, 0)],
      ]}
    />
  );

  return (
    <div className={styles.stack}>
      <div className={styles.cuadrantes}>
        {ORDEN.map((c) => (
          <div key={c} className={styles.cuadrante}>
            <p className={styles.kpiEtiqueta}>{c}</p>
            <p className={styles.kpiValor}>{conteo[c]}</p>
            <small>{DESCRIPCION[c]}</small>
          </div>
        ))}
      </div>

      <section className={a.card}>
        <div className={styles.cardCabecera}>
          <div>
            <h2 className={a.cardTitulo}>Matriz de ingeniería de menú</h2>
            <p className={a.cardBajada}>
              Popularidad (unidades vendidas) frente al margen unitario. Las líneas marcan el umbral de popularidad
              ({Math.round(matriz.umbralUnidades).toLocaleString('es-CL')} u.) y el margen promedio ponderado (
              {formatCLP(Math.round(matriz.margenPromedio))}).
            </p>
          </div>
          <ul className={styles.leyenda}>
            <li>
              <span style={{ background: COLOR.serie }} /> Producto
            </li>
            <li>
              <span style={{ background: COLOR.alerta }} /> Alto interés, baja conversión
            </li>
          </ul>
        </div>
        <div className={styles.grafico} style={{ height: 420 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 24, right: 32, bottom: 24, left: 8 }}>
              <CartesianGrid stroke={COLOR.grilla} />
              <XAxis
                type="number"
                dataKey="unidades"
                name="Unidades"
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: COLOR.grilla }}
              >
                <Label value="Unidades vendidas (popularidad)" position="bottom" offset={6} fill={COLOR.eje} fontSize={12} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="margen"
                name="Margen"
                tick={TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCLP(v)}
                width={80}
              >
                <Label value="Margen unitario" angle={-90} position="insideLeft" offset={-2} fill={COLOR.eje} fontSize={12} style={{ textAnchor: 'middle' }} />
              </YAxis>
              <ZAxis range={[90, 90]} />
              <ReferenceLine x={matriz.umbralUnidades} stroke={COLOR.eje} strokeDasharray="5 5" />
              <ReferenceLine y={matriz.margenPromedio} stroke={COLOR.eje} strokeDasharray="5 5" />
              <Tooltip cursor={{ strokeDasharray: '4 4' }} content={tooltip} />
              <Scatter data={normales} fill={COLOR.serie} stroke="#fff" strokeWidth={2} />
              <Scatter data={alertas} fill={COLOR.alerta} stroke="#fff" strokeWidth={2}>
                <LabelList dataKey="nombre" content={EtiquetaPunto} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <span className={`${styles.etiquetaCuadrante} ${styles.supIzq}`}>Rompecabezas</span>
          <span className={`${styles.etiquetaCuadrante} ${styles.supDer}`}>Estrellas</span>
          <span className={`${styles.etiquetaCuadrante} ${styles.infIzq}`}>Perros</span>
          <span className={`${styles.etiquetaCuadrante} ${styles.infDer}`}>Caballos de batalla</span>
        </div>
      </section>

      <section className={a.card}>
        <h2 className={a.cardTitulo}>Clasificación y acción sugerida</h2>
        <p className={a.cardBajada}>La conversión del embudo agrega una dimensión de interés a la matriz clásica.</p>
        <div className={a.tablaScroll}>
          <table className={a.tabla}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Clasificación</th>
                <th className={a.num}>Unidades</th>
                <th className={a.num}>Margen unitario</th>
                <th className={a.num}>Conversión</th>
                <th>Acción sugerida</th>
              </tr>
            </thead>
            <tbody>
              {ORDEN.flatMap((c) => matriz.items.filter((p) => p.clasificacion === c)).map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>
                    <span className={`${a.chip} ${styles['clase' + ORDEN.indexOf(p.clasificacion)]}`}>{p.clasificacion}</span>
                  </td>
                  <td className={a.num}>{p.unidades.toLocaleString('es-CL')}</td>
                  <td className={a.num}>{formatCLP(p.margen)}</td>
                  <td className={a.num}>
                    {formatPct(p.conversion, 0)}
                    {p.alerta && <span className={styles.convEtiqueta}>Baja</span>}
                  </td>
                  <td className={styles.accion}>
                    {p.alerta && p.clasificacion !== CLASIFICACION.ESTRELLA
                      ? 'Mucho interés sin conversión: revisar precio, foto o descripción.'
                      : ACCION[p.clasificacion]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
