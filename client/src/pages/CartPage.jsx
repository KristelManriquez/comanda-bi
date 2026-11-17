import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { crearPedido } from '../services/api';
import { formatCLP } from '../utils/format';
import PageHeader from '../components/PageHeader';
import QuantityStepper from '../components/QuantityStepper';
import { IconBag } from '../components/Icons';
import styles from './CartPage.module.css';

export default function CartPage() {
  const { mesa, token } = useOutletContext();
  const { lineas, total, cantidadTotal, cambiarCantidad, vaciar } = useCart();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cartaUrl = `/mesa/${token}`;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const pedido = await crearPedido({
        tokenMesa: token,
        items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, nota: l.nota })),
      });
      vaciar();
      navigate(`/mesa/${token}/pedido/${pedido.id}`, { replace: true, state: { recienEnviado: true } });
    } catch (e) {
      setError(e.message || 'No se pudo enviar el pedido. Inténtalo otra vez.');
      setEnviando(false);
    }
  };

  if (lineas.length === 0) {
    return (
      <>
        <PageHeader titulo="Tu pedido" backTo={cartaUrl} mesa={mesa} />
        <main className={styles.vacio}>
          <span className={styles.vacioIcono}>
            <IconBag width={36} height={36} />
          </span>
          <h2>Tu pedido está vacío</h2>
          <p>Agrega productos desde la carta y aparecerán aquí.</p>
          <Link to={cartaUrl} className="btn-primary">
            Ver la carta
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader titulo="Tu pedido" backTo={cartaUrl} mesa={mesa} />

      <main className={styles.main}>
        <ul className={styles.lista} aria-label="Productos en tu pedido">
          {lineas.map((l) => (
            <li key={l.key} className={styles.linea}>
              <div className={styles.lineaInfo}>
                <h3 className={styles.nombre}>{l.nombre}</h3>
                {l.nota && <p className={styles.nota}>“{l.nota}”</p>}
                <p className={styles.unitario}>{formatCLP(l.precio)} c/u</p>
              </div>
              <div className={styles.lineaAcciones}>
                <QuantityStepper
                  size="sm"
                  value={l.cantidad}
                  allowRemove
                  label={`Cantidad de ${l.nombre}`}
                  onChange={(c) => cambiarCantidad(l.key, c)}
                />
                <span className={styles.subtotal}>{formatCLP(l.precio * l.cantidad)}</span>
              </div>
            </li>
          ))}
        </ul>

        <Link to={cartaUrl} className={styles.agregarMas}>
          Agregar más productos
        </Link>

        <dl className={styles.resumen}>
          <div>
            <dt>Productos</dt>
            <dd>{cantidadTotal}</dd>
          </div>
          <div className={styles.totalFila}>
            <dt>Total</dt>
            <dd>{formatCLP(total)}</dd>
          </div>
        </dl>

        <p className={styles.aviso}>
          Tu pedido llegará al garzón y a la cocina. Pagas al final, en la mesa.
        </p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </main>

      <div className={styles.footer}>
        <button type="button" className="btn-primary" onClick={enviar} disabled={enviando}>
          {enviando ? 'Solicitando pedido…' : `Solicitar pedido de ${formatCLP(total)}`}
        </button>
      </div>
    </>
  );
}
