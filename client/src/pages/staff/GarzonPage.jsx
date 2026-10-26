import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cerrarCuenta,
  getMesasConCuenta,
  getPedidosSolicitados,
  logout,
  marcarRecibido,
} from '../../services/staffApi';
import { useEnVivo } from '../../hooks/useEnVivo';
import { formatCLP, formatHora, haceCuanto, minutosDesde } from '../../utils/format';
import { ESTADOS_PEDIDO, textoEstado } from '../../utils/pedido';
import { IconCheck, IconClose, IconLogout } from '../../components/Icons';
import Toast from '../../components/Toast';
import styles from './GarzonPage.module.css';

const cargarTodo = () => Promise.all([getPedidosSolicitados(), getMesasConCuenta()]);

/**
 * Vista del garzón (RF07, RF08), pensada para su teléfono:
 *  - "Por entregar": pedidos solicitados; al entregarlos los marca como recibidos.
 *  - "Mesas": estado de cada mesa; registra el pago presencial y cierra la cuenta.
 */
export default function GarzonPage({ usuario }) {
  const navigate = useNavigate();
  const [datos] = useEnVivo(cargarTodo, 20000);
  const [vista, setVista] = useState('entregar');
  const [mesaAbierta, setMesaAbierta] = useState(null);
  const [marcando, setMarcando] = useState(null);
  const [toast, setToast] = useState(null);

  const [pedidos, mesas] = datos ?? [null, null];
  const mesaSeleccionada = mesas?.find((m) => m.id === mesaAbierta) ?? null;

  const avisos = useRef(0);
  const avisar = (texto) => setToast({ id: ++avisos.current, texto });

  const entregar = async (pedido) => {
    setMarcando(pedido.id);
    await marcarRecibido(pedido.id, usuario);
    setMarcando(null);
    avisar(`Pedido #${pedido.id} de la mesa ${pedido.mesa_numero} marcado como recibido`);
  };

  const salir = () => {
    logout();
    navigate('/personal');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.rol}>Garzón · Fork</p>
          <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
        </div>
        <button type="button" className={styles.salir} onClick={salir}>
          <IconLogout />
          <span className="visually-hidden">Cerrar sesión</span>
        </button>
      </header>

      <nav className={styles.tabs} aria-label="Vistas del garzón">
        <button
          type="button"
          className={vista === 'entregar' ? styles.tabActiva : ''}
          onClick={() => setVista('entregar')}
          aria-pressed={vista === 'entregar'}
        >
          Por entregar
          {pedidos?.length > 0 && <span className={styles.badge}>{pedidos.length}</span>}
        </button>
        <button
          type="button"
          className={vista === 'mesas' ? styles.tabActiva : ''}
          onClick={() => setVista('mesas')}
          aria-pressed={vista === 'mesas'}
        >
          Mesas
        </button>
      </nav>

      <main className={styles.main}>
        {!datos && <p className={styles.cargando}>Cargando…</p>}

        {vista === 'entregar' && pedidos && (
          <>
            {pedidos.length === 0 && (
              <div className={styles.vacio}>
                <span className={styles.vacioIcono}>
                  <IconCheck width={26} height={26} />
                </span>
                <p>Todo entregado</p>
                <small>Los pedidos nuevos aparecerán aquí apenas el comensal los envíe.</small>
              </div>
            )}
            <ul className={styles.lista}>
              {pedidos.map((p) => (
                <li key={p.id} className={styles.pedido}>
                  <div className={styles.pedidoHead}>
                    <span className={styles.mesaChip}>Mesa {p.mesa_numero}</span>
                    <span className={`${styles.tiempo} ${minutosDesde(p.creado_en) >= 15 ? styles.tarde : ''}`}>
                      #{p.id} · {haceCuanto(p.creado_en)}
                    </span>
                  </div>
                  <ul className={styles.items}>
                    {p.detalle.map((d, i) => (
                      <li key={i}>
                        <strong>{d.cantidad}×</strong> {d.nombre}
                        {d.nota && <em>“{d.nota}”</em>}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => entregar(p)}
                    disabled={marcando === p.id}
                  >
                    <IconCheck width={18} height={18} />
                    {marcando === p.id ? 'Marcando…' : 'Entregado: marcar como recibido'}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {vista === 'mesas' && mesas && (
          <ul className={styles.mesas}>
            {mesas.map((m) => {
              const estado = !m.activa ? 'inactiva' : m.cuenta ? 'ocupada' : 'libre';
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`${styles.mesa} ${styles[estado]}`}
                    onClick={() => m.cuenta && setMesaAbierta(m.id)}
                    disabled={!m.cuenta}
                  >
                    <span className={styles.mesaNumero}>{m.numero}</span>
                    <span className={styles.mesaEstado}>
                      {estado === 'ocupada' ? 'Cuenta abierta' : estado === 'libre' ? 'Libre' : 'Inactiva'}
                    </span>
                    {m.cuenta && <span className={styles.mesaTotal}>{formatCLP(m.cuenta.total)}</span>}
                    {m.porEntregar > 0 && <span className={styles.mesaPendiente}>{m.porEntregar} por entregar</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {mesaSeleccionada && (
        <CuentaSheet
          mesa={mesaSeleccionada}
          usuario={usuario}
          onClose={() => setMesaAbierta(null)}
          onCerrada={(total) => {
            setMesaAbierta(null);
            avisar(`Cuenta de la mesa ${mesaSeleccionada.numero} cerrada: ${formatCLP(total)}`);
          }}
        />
      )}
      <Toast mensaje={toast} />
    </div>
  );
}

function CuentaSheet({ mesa, usuario, onClose, onCerrada }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const pendientes = mesa.porEntregar > 0;

  const cerrarConEscape = useCallback((e) => e.key === 'Escape' && onClose(), [onClose]);
  useEffect(() => {
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [cerrarConEscape]);

  const cerrar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const cuenta = await cerrarCuenta(mesa.cuenta.id, usuario);
      onCerrada(cuenta.total);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cuenta-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHead}>
          <div>
            <h2 id="cuenta-titulo">Mesa {mesa.numero}</h2>
            <p>Cuenta abierta desde las {formatHora(mesa.cuenta.abierta_en)}</p>
          </div>
          <button type="button" className={styles.cerrarSheet} onClick={onClose}>
            <IconClose />
            <span className="visually-hidden">Cerrar</span>
          </button>
        </div>

        <ul className={styles.cuentaPedidos}>
          {mesa.pedidos.map((p) => (
            <li key={p.id}>
              <div className={styles.cuentaPedidoHead}>
                <span>
                  Pedido #{p.id} · {formatHora(p.creado_en)}
                </span>
                <span className={p.estado === ESTADOS_PEDIDO.RECIBIDO ? styles.chipOk : styles.chipPend}>
                  {textoEstado(p.estado)}
                </span>
              </div>
              {p.detalle.map((d, i) => (
                <div key={i} className={styles.cuentaLinea}>
                  <span>
                    {d.cantidad}× {d.nombre}
                  </span>
                  <span>{formatCLP(d.cantidad * d.precio_unitario)}</span>
                </div>
              ))}
            </li>
          ))}
        </ul>

        <div className={styles.cuentaTotal}>
          <span>Total a pagar</span>
          <strong>{formatCLP(mesa.cuenta.total)}</strong>
        </div>

        {pendientes && (
          <p className={styles.aviso}>
            Hay {mesa.porEntregar === 1 ? 'un pedido' : `${mesa.porEntregar} pedidos`} sin entregar. Márcalos como
            recibidos antes de cerrar la cuenta.
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}

        {!confirmando ? (
          <button type="button" className="btn-primary" disabled={pendientes} onClick={() => setConfirmando(true)}>
            Registrar pago y cerrar cuenta
          </button>
        ) : (
          <div className={styles.confirmar}>
            <p>
              ¿Confirmas que la mesa {mesa.numero} pagó <strong>{formatCLP(mesa.cuenta.total)}</strong> de forma
              presencial?
            </p>
            <div className={styles.confirmarAcciones}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmando(false)} disabled={enviando}>
                Volver
              </button>
              <button type="button" className="btn-primary" onClick={cerrar} disabled={enviando}>
                {enviando ? 'Cerrando…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
