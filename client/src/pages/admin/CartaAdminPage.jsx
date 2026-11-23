import { useState } from 'react';
import {
  eliminarCategoria,
  getCatalogoAdmin,
  guardarCategoria,
  guardarProducto,
  moverCategoria,
  setActivoProducto,
  setDisponibleProducto,
} from '../../services/catalogo';
import { useEnVivo } from '../../hooks/useEnVivo';
import { formatCLP, formatPct } from '../../utils/format';
import Dialogo, { Campo, Casilla } from './ui/Dialogo';
import Aviso from './ui/Aviso';
import { useAviso } from './ui/useAviso';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';
import f from './ui/Formulario.module.css';

const cargar = getCatalogoAdmin;

const PRODUCTO_NUEVO = { nombre: '', descripcion: '', categoria_id: '', precio: '', costo: '', disponible: true, destacado: false };

/** Formulario de producto: nombre, categoría, descripción, precio, costo y disponibilidad. */
function ProductoForm({ inicial, categorias, onClose, onGuardado }) {
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState(null);
  const set = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e?.target ? e.target.value : e }));
    // El mensaje de error desaparece apenas se corrige el campo
    setError((er) => (er?.campo === campo ? null : er));
  };
  const precio = Number(datos.precio);
  const costo = Number(datos.costo);
  const margenValido = precio > 0 && costo >= 0 && costo < precio;

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await guardarProducto(datos);
      onGuardado(datos.id ? `«${datos.nombre.trim()}» actualizado` : `«${datos.nombre.trim()}» agregado a la carta`);
    } catch (err) {
      setError(err);
    }
  };
  const err = (campo) => (error?.campo === campo ? error.message : null);

  return (
    <Dialogo
      titulo={datos.id ? 'Editar producto' : 'Nuevo producto'}
      bajada="Los cambios se ven al instante en la carta de todas las mesas."
      onClose={onClose}
      pie={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-producto" className="btn-primary">
            Guardar producto
          </button>
        </>
      }
    >
      <form id="form-producto" onSubmit={guardar} className={f.cuerpo} style={{ padding: 0 }} noValidate>
        <Campo etiqueta="Nombre" error={err('nombre')}>
          <input value={datos.nombre} onChange={set('nombre')} maxLength={60} autoFocus />
        </Campo>
        <Campo etiqueta="Categoría" error={err('categoria_id')}>
          <select value={datos.categoria_id} onChange={set('categoria_id')}>
            <option value="">Elige una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Descripción" ayuda="Lo que verá el comensal en el detalle del producto.">
          <textarea value={datos.descripcion} onChange={set('descripcion')} maxLength={160} />
        </Campo>
        <Campo etiqueta="Precio de venta (CLP, IVA incluido)" error={err('precio')} ancho="medio">
          <input type="number" inputMode="numeric" min="1" step="100" value={datos.precio} onChange={set('precio')} />
        </Campo>
        <Campo etiqueta="Costo unitario (CLP)" error={err('costo')} ancho="medio" ayuda="Se usa para el margen en el dashboard.">
          <input type="number" inputMode="numeric" min="0" step="100" value={datos.costo} onChange={set('costo')} />
        </Campo>
        {margenValido && (
          <p className={f.vistaPrevia}>
            <span>Margen de contribución</span>
            <strong>
              {formatCLP(precio - costo)} · {formatPct((precio - costo) / precio, 0)}
            </strong>
          </p>
        )}
        <Casilla
          etiqueta="Disponible"
          descripcion="Si no, aparece como agotado."
          checked={datos.disponible}
          onChange={set('disponible')}
        />
        <Casilla
          etiqueta="Destacado"
          descripcion="Se muestra en «Lo más pedido»."
          checked={datos.destacado}
          onChange={set('destacado')}
        />
        {error && !error.campo && <p className={f.errorGeneral}>{error.message}</p>}
      </form>
    </Dialogo>
  );
}

function CategoriaForm({ inicial, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [error, setError] = useState(null);
  const guardar = async (e) => {
    e.preventDefault();
    try {
      await guardarCategoria({ id: inicial?.id, nombre });
      onGuardado(inicial ? 'Categoría actualizada' : `Categoría «${nombre.trim()}» creada`);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialogo
      titulo={inicial ? 'Editar categoría' : 'Nueva categoría'}
      onClose={onClose}
      pie={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-categoria" className="btn-primary">
            Guardar
          </button>
        </>
      }
    >
      <form id="form-categoria" onSubmit={guardar} className={f.cuerpo} style={{ padding: 0 }} noValidate>
        <Campo etiqueta="Nombre de la categoría" error={error} ayuda="Una categoría sin productos no se muestra al comensal.">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} autoFocus />
        </Campo>
      </form>
    </Dialogo>
  );
}

/** Gestión de la carta (RF09): categorías y productos con precio, costo y disponibilidad. */
export default function CartaAdminPage() {
  const [datos, recargar] = useEnVivo(cargar);
  const [editando, setEditando] = useState(null); // { tipo: 'producto' | 'categoria', valor }
  const [aviso, avisar] = useAviso();

  if (!datos) return null;
  const { categorias, productos } = datos;
  const activos = productos.filter((p) => p.activo !== false);
  const retirados = productos.filter((p) => p.activo === false);
  const nombreCategoria = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));

  const cerrar = () => setEditando(null);
  const guardado = (texto) => {
    setEditando(null);
    avisar(texto);
    recargar();
  };
  const intentar = async (accion, texto) => {
    try {
      await accion();
      if (texto) avisar(texto);
    } catch (err) {
      avisar(err.message, true);
    }
    recargar();
  };

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Carta</h1>
          <p className={a.bajada}>
            {activos.length} productos en {categorias.length} categorías. Los cambios se ven al instante en la carta de las
            mesas.
          </p>
        </div>
        <div className={styles.botonesCabecera}>
          <button type="button" className={styles.botonSecundario} onClick={() => setEditando({ tipo: 'categoria' })}>
            + Nueva categoría
          </button>
          <button
            type="button"
            className={styles.botonPrimario}
            onClick={() => setEditando({ tipo: 'producto', valor: PRODUCTO_NUEVO })}
          >
            + Nuevo producto
          </button>
        </div>
      </header>

      <div className={styles.categorias}>
        {categorias.map((c, i) => {
          const suyos = activos.filter((p) => p.categoria_id === c.id);
          return (
            <section key={c.id} className={a.card}>
              <div className={styles.cabeceraCategoria}>
                <h2 className={a.cardTitulo}>
                  {c.nombre} <small>{suyos.length} productos</small>
                </h2>
                <div className={styles.acciones}>
                  <button type="button" className={styles.botonTexto} disabled={i === 0} onClick={() => intentar(() => moverCategoria(c.id, -1))}>
                    ↑ Subir
                  </button>
                  <button
                    type="button"
                    className={styles.botonTexto}
                    disabled={i === categorias.length - 1}
                    onClick={() => intentar(() => moverCategoria(c.id, 1))}
                  >
                    ↓ Bajar
                  </button>
                  <button type="button" className={styles.botonTexto} onClick={() => setEditando({ tipo: 'categoria', valor: c })}>
                    Renombrar
                  </button>
                  <button
                    type="button"
                    className={`${styles.botonTexto} ${styles.botonPeligro}`}
                    onClick={() => intentar(() => eliminarCategoria(c.id), `Categoría «${c.nombre}» eliminada`)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              {suyos.length === 0 ? (
                <p className={styles.vacia}>Sin productos. Esta categoría no se muestra al comensal.</p>
              ) : (
                <div className={a.tablaScroll}>
                  <table className={a.tabla}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className={a.num}>Precio</th>
                        <th className={a.num}>Costo</th>
                        <th className={a.num}>Margen</th>
                        <th>Disponible</th>
                        <th className={a.num}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suyos.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.nombre}</strong>
                            {p.destacado && (
                              <span className={styles.chips}>
                                <span className={a.chip}>Destacado</span>
                              </span>
                            )}
                            <span className={styles.descripcion}>{p.descripcion}</span>
                          </td>
                          <td className={a.num}>{formatCLP(p.precio)}</td>
                          <td className={a.num}>{formatCLP(p.costo)}</td>
                          <td className={a.num}>
                            {formatCLP(p.precio - p.costo)}{' '}
                            <small className={styles.pct}>{formatPct((p.precio - p.costo) / p.precio, 0)}</small>
                          </td>
                          <td>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={p.disponible}
                                onChange={(e) => intentar(() => setDisponibleProducto(p.id, e.target.checked))}
                              />
                              <span className={styles.switchPista} aria-hidden="true" />
                              <span>{p.disponible ? 'Sí' : 'Agotado'}</span>
                            </label>
                          </td>
                          <td>
                            <div className={styles.acciones}>
                              <button
                                type="button"
                                className={styles.botonTexto}
                                onClick={() => setEditando({ tipo: 'producto', valor: p })}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={`${styles.botonTexto} ${styles.botonPeligro}`}
                                onClick={() => intentar(() => setActivoProducto(p.id, false), `«${p.nombre}» retirado de la carta`)}
                              >
                                Retirar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {retirados.length > 0 && (
          <section className={a.card}>
            <h2 className={a.cardTitulo}>Retirados de la carta</h2>
            <p className={a.cardBajada}>
              No se muestran al comensal, pero sus ventas pasadas se mantienen en el dashboard.
            </p>
            <table className={a.tabla}>
              <tbody>
                {retirados.map((p) => (
                  <tr key={p.id} className={styles.retirado}>
                    <td>
                      <strong>{p.nombre}</strong>
                      <span className={styles.descripcion}>{nombreCategoria[p.categoria_id] ?? 'Sin categoría'}</span>
                    </td>
                    <td className={a.num}>{formatCLP(p.precio)}</td>
                    <td>
                      <div className={styles.acciones}>
                        <button
                          type="button"
                          className={styles.botonTexto}
                          onClick={() => {
                            if (!nombreCategoria[p.categoria_id]) {
                              setEditando({ tipo: 'producto', valor: { ...p, categoria_id: '' } });
                              return;
                            }
                            intentar(() => setActivoProducto(p.id, true), `«${p.nombre}» vuelve a la carta`);
                          }}
                        >
                          Reincorporar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {editando?.tipo === 'producto' && (
        <ProductoForm
          inicial={editando.valor}
          categorias={categorias}
          onClose={cerrar}
          onGuardado={async (t) => {
            if (editando.valor.activo === false) await intentar(() => setActivoProducto(editando.valor.id, true));
            guardado(t);
          }}
        />
      )}
      {editando?.tipo === 'categoria' && <CategoriaForm inicial={editando.valor} onClose={cerrar} onGuardado={guardado} />}
      <Aviso aviso={aviso} />
    </>
  );
}
