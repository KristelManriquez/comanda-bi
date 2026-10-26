import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cargarPedidosDemo, reiniciarDemo } from '../services/staffApi';
import { mesas } from '../data/mockData';
import styles from './DemoMesasPage.module.css';

/**
 * Página solo para desarrollo y demostración: simula "escanear"
 * el QR de cada mesa. En producción el comensal entra directo
 * a /mesa/:token desde el código impreso.
 */
export default function DemoMesasPage() {
  const [aviso, setAviso] = useState(null);
  const cargar = () => {
    cargarPedidosDemo();
    setAviso('Se cargaron 5 mesas con pedidos de ejemplo.');
  };
  const reiniciar = () => {
    reiniciarDemo();
    setAviso('Se borraron los pedidos, cuentas y eventos de la demostración.');
  };

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

      <h2 className={styles.subtitulo}>Vistas del personal</h2>
      <p className={styles.intro}>Garzón, cocina y administración ingresan con su usuario y rol.</p>
      <Link to="/personal" className={`btn-primary ${styles.personal}`}>
        Ir al acceso del personal
      </Link>

      <div className={styles.herramientas}>
        <p>Datos de demostración</p>
        <div>
          <button type="button" className="btn-secondary" onClick={cargar}>
            Cargar pedidos de ejemplo
          </button>
          <button type="button" className="btn-secondary" onClick={reiniciar}>
            Reiniciar demo
          </button>
        </div>
        {aviso && <small role="status">{aviso}</small>}
      </div>
    </main>
  );
}
