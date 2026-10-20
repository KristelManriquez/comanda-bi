import { Link } from 'react-router-dom';
import { mesas } from '../data/mockData';
import styles from './DemoMesasPage.module.css';

/**
 * Página solo para desarrollo y demostración: simula "escanear"
 * el QR de cada mesa. En producción el comensal entra directo
 * a /mesa/:token desde el código impreso.
 */
export default function DemoMesasPage() {
  return (
    <main className={styles.main}>
      <p className={styles.mark}>fork</p>
      <h1>Mesas de prueba</h1>
      <p className={styles.intro}>
        Elige una mesa para abrir la carta como si hubieras escaneado su código QR.
      </p>
      <ul className={styles.grid}>
        {mesas.map((m) => (
          <li key={m.id}>
            <Link to={`/mesa/${m.token_qr}`} className={`${styles.mesa} ${!m.activa ? styles.inactiva : ''}`}>
              <span className={styles.numero}>{m.numero}</span>
              <span className={styles.estado}>{m.activa ? 'Mesa' : 'Mesa inactiva'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
