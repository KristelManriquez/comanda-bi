import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCLP, formatCLPCorto } from '../../../utils/format';
import ChartTooltip from './ChartTooltip';
import { COLOR, MARGEN, TICK } from './chartTheme';
import a from '../Admin.module.css';
import styles from './Bi.module.css';

const fechaCorta = (d) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
const fechaLarga = (d) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

function Variacion({ actual, anterior, menorEsMejor = false }) {
  if (!anterior) return <span className={styles.varNeutra}>Sin periodo anterior</span>;
  const v = (actual - anterior) / anterior;
  const mejora = menorEsMejor ? v < 0 : v > 0;
  const signo = v > 0 ? '▲' : v < 0 ? '▼' : '';
  return (
    <span className={mejora ? styles.varBuena : styles.varMala}>
      {signo} {Math.abs(v * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })} %
      <small> vs. periodo anterior</small>
    </span>
  );
}

function Kpi({ etiqueta, valor, children }) {
  return (
    <div className={styles.kpi}>
      <p className={styles.kpiEtiqueta}>{etiqueta}</p>
      <p className={styles.kpiValor}>{valor}</p>
      {children}
    </div>
  );
}

function Ranking({ titulo, bajada, items }) {
  const max = Math.max(...items.map((p) => p.unidades), 1);
  return (
    <section className={a.card}>
      <h2 className={a.cardTitulo}>{titulo}</h2>
      <p className={a.cardBajada}>{bajada}</p>
      {items.length === 0 && <p className={a.cardBajada}>Aún no hay ventas en este periodo.</p>}
      <ol className={styles.ranking}>
        {items.map((p, i) => (
          <li key={p.id}>
            <span className={styles.rankPos}>{i + 1}</span>
            <div className={styles.rankCuerpo}>
              <div className={styles.rankFila}>
                <span>{p.nombre}</span>
                <strong>{p.unidades.toLocaleString('es-CL')} u.</strong>
              </div>
              <div className={styles.rankBarra}>
                <span style={{ width: `${(p.unidades / max) * 100}%` }} />
              </div>
              <small>{formatCLP(p.ventas)} en ventas</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Indicadores de ventas (RF11). */
export default function VentasTab({ datos }) {
  const { actual, anterior } = datos;
  const serie = datos.porDia.map((d) => ({ ...d, etiqueta: fechaCorta(d.fecha) }));
  const intervalo = Math.max(0, Math.ceil(serie.length / 10) - 1);

  return (
    <div className={styles.stack}>
      <div className={styles.kpis}>
        <Kpi etiqueta="Ventas" valor={formatCLP(actual.ventas)}>
          <Variacion actual={actual.ventas} anterior={anterior.ventas} />
        </Kpi>
        <Kpi etiqueta="Cuentas cerradas" valor={actual.cuentas.toLocaleString('es-CL')}>
          <Variacion actual={actual.cuentas} anterior={anterior.cuentas} />
        </Kpi>
        <Kpi etiqueta="Pedidos" valor={actual.pedidos.toLocaleString('es-CL')}>
          <Variacion actual={actual.pedidos} anterior={anterior.pedidos} />
        </Kpi>
        <Kpi etiqueta="Ticket promedio por cuenta" valor={formatCLP(Math.round(actual.ticket))}>
          <Variacion actual={actual.ticket} anterior={anterior.ticket} />
        </Kpi>
        <Kpi
          etiqueta="Tiempo promedio de entrega"
          valor={`${actual.entrega.toLocaleString('es-CL', { maximumFractionDigits: 1 })} min`}
        >
          <Variacion actual={actual.entrega} anterior={anterior.entrega} menorEsMejor />
        </Kpi>
      </div>

      <section className={a.card}>
        <h2 className={a.cardTitulo}>Ventas por día</h2>
        <p className={a.cardBajada}>Total de las cuentas cerradas cada día.</p>
        <div className={styles.grafico} style={{ height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={serie} margin={MARGEN}>
              <CartesianGrid vertical={false} stroke={COLOR.grilla} />
              <XAxis dataKey="etiqueta" tick={TICK} tickLine={false} axisLine={{ stroke: COLOR.grilla }} interval={intervalo} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={formatCLPCorto} width={72} />
              <Tooltip
                cursor={{ stroke: COLOR.eje, strokeDasharray: '4 4' }}
                content={
                  <ChartTooltip
                    titulo={(d) => fechaLarga(d.fecha)}
                    filas={(d) => [
                      ['Ventas', formatCLP(d.ventas)],
                      ['Cuentas', d.cuentas],
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke={COLOR.serie}
                strokeWidth={2}
                fill={COLOR.serieSuave}
                fillOpacity={0.7}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className={styles.dosColumnas}>
        <section className={a.card}>
          <h2 className={a.cardTitulo}>Ventas por franja horaria</h2>
          <p className={a.cardBajada}>Según la hora en que se envió cada pedido.</p>
          <div className={styles.grafico} style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={datos.porFranja} margin={MARGEN} barCategoryGap={4}>
                <CartesianGrid vertical={false} stroke={COLOR.grilla} />
                <XAxis dataKey="franja" tick={TICK} tickLine={false} axisLine={{ stroke: COLOR.grilla }} interval={0} tickFormatter={(f) => f.replace(':00', ' h')} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={formatCLPCorto} width={72} />
                <Tooltip
                  cursor={{ fill: COLOR.serieSuave }}
                  content={<ChartTooltip titulo={(d) => `${d.franja} a ${parseInt(d.franja) + 1}:00`} filas={(d) => [['Ventas', formatCLP(d.ventas)]]} />}
                />
                <Bar dataKey="ventas" fill={COLOR.serie} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={a.card}>
          <h2 className={a.cardTitulo}>Ventas por categoría</h2>
          <p className={a.cardBajada}>Suma de los productos vendidos de cada categoría.</p>
          <div className={styles.grafico} style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={datos.porCategoria} layout="vertical" margin={{ ...MARGEN, right: 16 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} stroke={COLOR.grilla} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={formatCLPCorto} />
                <YAxis type="category" dataKey="nombre" tick={TICK} tickLine={false} axisLine={false} width={108} />
                <Tooltip
                  cursor={{ fill: COLOR.serieSuave }}
                  content={<ChartTooltip titulo={(d) => d.nombre} filas={(d) => [['Ventas', formatCLP(d.ventas)]]} />}
                />
                <Bar dataKey="ventas" fill={COLOR.serie} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className={styles.dosColumnas}>
        <Ranking titulo="Productos más vendidos" bajada="Por unidades vendidas en el periodo." items={datos.masVendidos} />
        <Ranking titulo="Productos menos vendidos" bajada="Candidatos a revisar en la carta." items={datos.menosVendidos} />
      </div>
    </div>
  );
}
