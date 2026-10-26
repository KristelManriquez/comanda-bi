import { useState } from 'react';
import { formatPct } from '../../../utils/format';
import { IconAlert } from '../../../components/Icons';
import a from '../Admin.module.css';
import styles from './Bi.module.css';

/** Embudo horizontal: cada etapa con su valor, su porcentaje del inicio y el paso desde la anterior. */
function Embudo({ etapas }) {
  const inicio = etapas[0]?.valor || 1;
  return (
    <ol className={styles.embudo}>
      {etapas.map((e, i) => {
        const anterior = i > 0 ? etapas[i - 1].valor : null;
        return (
          <li key={e.etapa}>
            {anterior !== null && (
              <p className={styles.paso}>↓ {anterior ? formatPct(e.valor / anterior, 0) : '–'} continúa</p>
            )}
            <div className={styles.etapaFila}>
              <span className={styles.etapaNombre}>{e.etapa}</span>
              <span className={styles.etapaValor}>
                <strong>{e.valor.toLocaleString('es-CL')}</strong> · {formatPct(e.valor / inicio, 0)}
              </span>
            </div>
            <div className={styles.etapaBarra}>
              <span style={{ width: `${Math.max(2, (e.valor / inicio) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Embudo de conversión de la carta (RF12), a partir de eventos anónimos. */
export default function EmbudoTab({ embudo }) {
  const totalDetalle = embudo.productos.reduce((s, p) => s + p.detalle, 0);
  const totalEnviar = embudo.productos.reduce((s, p) => s + p.enviar, 0);
  const media = totalDetalle ? totalEnviar / totalDetalle : 0;
  const alertas = embudo.productos
    .map((p, rank) => ({ ...p, rank: rank + 1 }))
    .filter((p) => p.detalle > 0 && p.conversion < media * 0.6)
    .slice(0, 2);

  const [seleccion, setSeleccion] = useState(alertas[0]?.id ?? embudo.productos[0]?.id);
  const producto = embudo.productos.find((p) => p.id === seleccion) ?? embudo.productos[0];

  return (
    <div className={styles.stack}>
      <div className={styles.dosColumnas}>
        <section className={a.card}>
          <h2 className={a.cardTitulo}>Embudo de la carta</h2>
          <p className={a.cardBajada}>Sesiones anónimas de comensales en el periodo, sin datos personales.</p>
          <Embudo etapas={embudo.etapas} />
        </section>

        <section className={a.card}>
          <h2 className={a.cardTitulo}>Embudo de «{producto.nombre}»</h2>
          <p className={a.cardBajada}>Elige un producto en la tabla para ver su embudo.</p>
          <Embudo
            etapas={[
              { etapa: 'Vio la carta', valor: producto.sesiones },
              { etapa: 'Abrió su detalle', valor: producto.detalle },
              { etapa: 'Lo agregó al pedido', valor: producto.agregar },
              { etapa: 'Lo pidió', valor: producto.enviar },
            ]}
          />
        </section>
      </div>

      {alertas.length > 0 && (
        <div className={styles.alertas}>
          {alertas.map((p) => (
            <div key={p.id} className={styles.alerta}>
              <span className={styles.alertaIcono}>
                <IconAlert />
              </span>
              <p>
                <strong>{p.nombre}</strong> es el {p.rank}.º producto con más vistas de detalle, pero solo el{' '}
                <strong>{formatPct(p.conversion, 0)}</strong> de quienes lo miran lo pide (promedio de la carta:{' '}
                {formatPct(media, 0)}). Conviene revisar su precio, foto o descripción.
              </p>
            </div>
          ))}
        </div>
      )}

      <section className={a.card}>
        <h2 className={a.cardTitulo}>Conversión por producto</h2>
        <p className={a.cardBajada}>Ordenado por vistas de detalle. Conversión = pedidos ÷ vistas de detalle.</p>
        <div className={a.tablaScroll}>
          <table className={a.tabla}>
            <thead>
              <tr>
                <th>Producto</th>
                <th className={a.num}>Vistas de detalle</th>
                <th className={a.num}>Agregados</th>
                <th className={a.num}>Pedidos</th>
                <th>Conversión</th>
              </tr>
            </thead>
            <tbody>
              {embudo.productos.map((p) => {
                const baja = p.detalle > 0 && p.conversion < media * 0.6;
                return (
                  <tr
                    key={p.id}
                    className={`${styles.filaClic} ${p.id === producto.id ? styles.filaActiva : ''}`}
                    onClick={() => setSeleccion(p.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSeleccion(p.id)}
                    aria-selected={p.id === producto.id}
                  >
                    <td>{p.nombre}</td>
                    <td className={a.num}>
                      {p.detalle.toLocaleString('es-CL')}
                    </td>
                    <td className={a.num}>{p.agregar.toLocaleString('es-CL')}</td>
                    <td className={a.num}>{p.enviar.toLocaleString('es-CL')}</td>
                    <td>
                      <span className={styles.conv}>
                        <span className={styles.convBarra}>
                          <span
                            className={baja ? styles.convBaja : undefined}
                            style={{ width: `${p.conversion * 100}%` }}
                          />
                        </span>
                        <strong>{formatPct(p.conversion, 0)}</strong>
                        {baja && <span className={styles.convEtiqueta}>Baja</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
