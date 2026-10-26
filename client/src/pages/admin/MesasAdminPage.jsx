import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getMesas } from '../../services/staffApi';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';

/** Mesas y sus códigos QR (RF10). Cada QR abre la carta con el token aleatorio de la mesa. */
export default function MesasAdminPage() {
  const [mesas, setMesas] = useState(null);
  useEffect(() => {
    getMesas().then(setMesas);
  }, []);
  const origen = window.location.origin;

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Mesas y códigos QR</h1>
          <p className={a.bajada}>
            Cada código contiene un identificador aleatorio, para que no se pueda adivinar la dirección de otra mesa.
          </p>
        </div>
        <button type="button" className={styles.botonSecundario} disabled title="Disponible en el sprint 3">
          + Nueva mesa
        </button>
      </header>

      <ul className={styles.mesas}>
        {mesas?.map((m) => (
          <li key={m.id} className={`${a.card} ${styles.mesa} ${!m.activa ? styles.mesaInactiva : ''}`}>
            <div className={styles.qr}>
              <QRCodeSVG value={`${origen}/mesa/${m.token_qr}`} size={148} fgColor="#1d1029" marginSize={0} />
            </div>
            <div className={styles.mesaInfo}>
              <h2>Mesa {m.numero}</h2>
              <span className={`${a.chip} ${m.activa ? a.chipOk : a.chipGris}`}>{m.activa ? 'Activa' : 'Inactiva'}</span>
            </div>
            <code className={styles.token}>/mesa/{m.token_qr}</code>
            {m.activa && (
              <Link to={`/mesa/${m.token_qr}`} target="_blank" className={styles.abrir}>
                Abrir carta de la mesa
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
