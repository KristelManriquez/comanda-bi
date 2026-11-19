import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPedidosSolicitados, logout } from '../../services/staffApi';
import { useEnVivo } from '../../hooks/useEnVivo';
import { formatHora, minutosDesde } from '../../utils/format';
import { IconChef, IconLogout } from '../../components/Icons';
import styles from './CocinaPage.module.css';

/** Nivel de espera de un pedido: guía visual para priorizar (con texto, no solo color). */
function nivelEspera(min) {
  if (min >= 20) return { clase: styles.critico, texto: 'Demorado' };
  if (min >= 10) return { clase: styles.atento, texto: 'En espera' };
  return { clase: styles.normal, texto: 'Nuevo' };
}

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return <span className={styles.reloj}>{formatHora(ahora.toISOString())}</span>;
}

/**
 * Pantalla de cocina (RF06): solo visualiza los pedidos solicitados, del
 * más antiguo al más reciente. El personal de cocina no toca el dispositivo:
 * el pedido desaparece cuando el garzón lo marca como recibido.
 */
export default function CocinaPage({ usuario }) {
  const navigate = useNavigate();
  const [pedidos] = useEnVivo(getPedidosSolicitados, 20000);

  const salir = () => {
    logout();
    navigate('/personal');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titulo}>
          <span className={styles.icono}>
            <IconChef width={26} height={26} />
          </span>
          <div>
            <h1>Cocina</h1>
            <p>El 10 · pedidos solicitados en tiempo real</p>
          </div>
        </div>
        <div className={styles.estado}>
          <span className={styles.contador}>
            <strong>{pedidos?.length ?? '–'}</strong> por preparar
          </span>
          <Reloj />
          <button type="button" className={styles.salir} onClick={salir} title={`Cerrar sesión de ${usuario.nombre}`}>
            <IconLogout />
            <span className="visually-hidden">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {pedidos && pedidos.length === 0 && (
        <div className={styles.vacio}>
          <p>Sin pedidos pendientes</p>
          <span>Los nuevos pedidos aparecerán aquí automáticamente.</span>
        </div>
      )}

      <ol className={styles.grilla}>
        {pedidos?.map((p) => {
          const min = minutosDesde(p.creado_en);
          const nivel = nivelEspera(min);
          return (
            <li key={p.id} className={`${styles.ticket} ${nivel.clase}`}>
              <div className={styles.ticketHead}>
                <span className={styles.mesa}>Mesa {p.mesa_numero}</span>
                <span className={styles.espera}>
                  <strong>{min} min</strong>
                  <small>{nivel.texto}</small>
                </span>
              </div>
              <p className={styles.meta}>
                Pedido #{p.id} · {formatHora(p.creado_en)}
              </p>
              <ul className={styles.items}>
                {p.detalle.map((d, i) => (
                  <li key={i}>
                    <span className={styles.cant}>{d.cantidad}</span>
                    <span>
                      {d.nombre}
                      {d.nota && <em className={styles.nota}>{d.nota}</em>}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <footer className={styles.pie}>
        El pedido sale de esta pantalla cuando el garzón lo entrega y lo marca como recibido.
      </footer>
    </div>
  );
}
