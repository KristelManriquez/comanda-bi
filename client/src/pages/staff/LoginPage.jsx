import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, INICIO_ROL, ROLES, NOMBRE_ROL } from '../../services/staffApi';
import { PASSWORD_DEMO, usuarios } from '../../data/mockData';
import { IconChart, IconChef, IconTray } from '../../components/Icons';
import styles from './LoginPage.module.css';

const ACCESOS_DEMO = [
  { rol: ROLES.GARZON, icono: IconTray, texto: 'Entregar pedidos y cerrar cuentas' },
  { rol: ROLES.COCINA, icono: IconChef, texto: 'Ver los pedidos solicitados' },
  { rol: ROLES.ADMIN, icono: IconChart, texto: 'Dashboard, carta, mesas y usuarios' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.sinPermiso ? 'Tu rol no tiene acceso a esa vista.' : null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (c = correo, p = password) => {
    setEnviando(true);
    setError(null);
    try {
      const { usuario } = await login(c, p);
      const destino = location.state?.desde;
      navigate(destino && usuario.rol === ROLES.ADMIN ? destino : INICIO_ROL[usuario.rol], { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    entrar();
  };

  const accesoRapido = (rol) => {
    const u = usuarios.find((x) => x.rol === rol);
    setCorreo(u.correo);
    setPassword(PASSWORD_DEMO);
    entrar(u.correo, PASSWORD_DEMO);
  };

  return (
    <main className={styles.page}>
      <section className={styles.marca}>
        <p className={styles.logo}>fork</p>
        <h1>Acceso del personal</h1>
        <p>Garzones, cocina y administración ingresan con su correo. Cada rol ve solo lo que necesita.</p>
        <p className={styles.producto}>Comanda BI</p>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <h2>Iniciar sesión</h2>
          <label className={styles.campo}>
            <span>Correo</span>
            <input
              type="email"
              autoComplete="username"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="nombre@fork.cl"
              required
            />
          </label>
          <label className={styles.campo}>
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={enviando || !correo || !password}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className={styles.demo}>
          <p className={styles.demoTitulo}>Acceso rápido para la demostración</p>
          <ul>
            {ACCESOS_DEMO.map(({ rol, icono: Icono, texto }) => (
              <li key={rol}>
                <button type="button" className={styles.rol} onClick={() => accesoRapido(rol)} disabled={enviando}>
                  <span className={styles.rolIcono}>
                    <Icono width={22} height={22} />
                  </span>
                  <span>
                    <strong>{NOMBRE_ROL[rol]}</strong>
                    <small>{texto}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/" className={styles.volver}>
            Volver a las mesas de prueba
          </Link>
        </div>
      </section>
    </main>
  );
}
