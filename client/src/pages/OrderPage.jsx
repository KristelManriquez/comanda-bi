import { useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { getPedido, suscribir } from '../services/api';
import { PASOS_PEDIDO, indiceEstado, ESTADOS_PEDIDO } from '../utils/pedido';
import { formatCLP, formatHora } from '../utils/format';
import PageHeader from '../components/PageHeader';
import StatusScreen from '../components/StatusScreen';
import { IconCheck } from '../components/Icons';
import styles from './OrderPage.module.css';

export default function OrderPage() {
  const { mesa, token } = useOutletContext();
  const { pedidoId } = useParams();
  const location = useLocation();
  const recienEnviado = location.state?.recienEnviado;

  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);

  // El cambio de estado llega al instante cuando el garzón marca el pedido
  // (en la demo, por store.js; con el servidor, por Socket.IO).
  useEffect(() => {
    let activo = true;
    const cargar = () =>
      getPedido(pedidoId, token)
        .then((p) => activo && setPedido(p))
        .catch((e) => activo && setError(e));
    cargar();
    const desuscribir = suscribir(cargar, { mesa: token });
    const id = setInterval(cargar, 5000);
    return () => {
      activo = false;
      desuscribir();
      clearInterval(id);
    };
  }, [pedidoId, token]);

  const cartaUrl = `/mesa/${token}`;

  if (error) {
    return (
      <StatusScreen titulo="No encontramos ese pedido" texto="Puede que sea de otra mesa. Vuelve a la carta.">
        <Link to={cartaUrl} className="btn-primary">
          Volver a la carta
        </Link>
      </StatusScreen>
    );
  }

  if (!pedido) return <StatusScreen cargando titulo="Buscando tu pedido" />;

  const actual = indiceEstado(pedido.estado);
  const entregado = pedido.estado === ESTADOS_PEDIDO.RECIBIDO;

  return (
    <>
      <PageHeader titulo={`Pedido #${pedido.id}`} backTo={cartaUrl} mesa={mesa} />

      <main className={styles.main}>
        {recienEnviado && !entregado && (
          <div className={styles.confirmacion}>
            <span className={styles.confirmacionIcono}>
              <IconCheck width={22} height={22} />
            </span>
            <div>
              <h2>Pedido enviado</h2>
              <p>Puedes seguir su estado aquí. Esta página se actualiza sola.</p>
            </div>
          </div>
        )}

        <section aria-labelledby="estado-title" className={styles.bloque}>
          <h2 id="estado-title" className={styles.bloqueTitulo}>
            Estado
          </h2>
          <ol className={styles.pasos}>
            {PASOS_PEDIDO.map((paso, i) => {
              const hecho = i < actual || (entregado && i === actual);
              const enCurso = i === actual && !entregado;
              return (
                <li
                  key={paso.estado}
                  className={`${styles.paso} ${hecho ? styles.hecho : ''} ${enCurso ? styles.enCurso : ''}`}
                  aria-current={enCurso ? 'step' : undefined}
                >
                  <span className={styles.marca} aria-hidden="true">
                    {hecho ? <IconCheck /> : i + 1}
                  </span>
                  <div>
                    <p className={styles.pasoTitulo}>{paso.titulo}</p>
                    {(enCurso || (entregado && i === actual)) && (
                      <p className={styles.pasoDetalle}>{paso.detalle}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="detalle-title" className={styles.bloque}>
          <div className={styles.detalleHead}>
            <h2 id="detalle-title" className={styles.bloqueTitulo}>
              Detalle
            </h2>
            <span className={styles.hora}>Enviado a las {formatHora(pedido.creado_en)}</span>
          </div>
          <ul className={styles.items}>
            {pedido.detalle.map((d, i) => (
              <li key={i}>
                <span className={styles.cant}>{d.cantidad}×</span>
                <span className={styles.itemNombre}>
                  {d.nombre}
                  {d.opcion && <strong className={styles.opcion}> · {d.opcion}</strong>}
                  {d.nota && <em>“{d.nota}”</em>}
                </span>
                <span className={styles.itemPrecio}>{formatCLP(d.precio_unitario * d.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>Total</span>
            <span>{formatCLP(pedido.total)}</span>
          </div>
        </section>

        <p className={styles.aviso}>Cuando quieras pagar, avísale al garzón.</p>

        <Link to={cartaUrl} className="btn-secondary">
          Pedir algo más
        </Link>
      </main>
    </>
  );
}
