import { useCallback } from 'react';
import { categorias } from '../../data/mockData';
import { getProductosAdmin, setDisponible } from '../../services/staffApi';
import { useEnVivo } from '../../hooks/useEnVivo';
import { formatCLP, formatPct } from '../../utils/format';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';

/** Gestión de la carta (RF09): precio, costo, margen y disponibilidad. */
export default function CartaAdminPage() {
  const cargar = useCallback(() => getProductosAdmin(), []);
  const [productos] = useEnVivo(cargar);

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Carta</h1>
          <p className={a.bajada}>
            Al marcar un producto como no disponible, aparece agotado al instante en la carta de todas las mesas.
          </p>
        </div>
        <button type="button" className={styles.botonSecundario} disabled title="Disponible en el sprint 3">
          + Nuevo producto
        </button>
      </header>

      {!productos && <p className={a.nota}>Cargando…</p>}
      <div className={styles.categorias}>
        {productos &&
          categorias.map((c) => (
            <section key={c.id} className={a.card}>
              <h2 className={a.cardTitulo}>{c.nombre}</h2>
              <div className={a.tablaScroll}>
                <table className={a.tabla}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className={a.num}>Precio</th>
                      <th className={a.num}>Costo</th>
                      <th className={a.num}>Margen</th>
                      <th>Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos
                      .filter((p) => p.categoria_id === c.id)
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.nombre}</strong>
                            <span className={styles.descripcion}>{p.descripcion}</span>
                          </td>
                          <td className={a.num}>{formatCLP(p.precio)}</td>
                          <td className={a.num}>{formatCLP(p.costo)}</td>
                          <td className={a.num}>
                            {formatCLP(p.precio - p.costo)} <small className={styles.pct}>{formatPct((p.precio - p.costo) / p.precio, 0)}</small>
                          </td>
                          <td>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={p.disponible}
                                onChange={(e) => setDisponible(p.id, e.target.checked)}
                              />
                              <span className={styles.switchPista} aria-hidden="true" />
                              <span>{p.disponible ? 'Sí' : 'Agotado'}</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
      </div>
    </>
  );
}
