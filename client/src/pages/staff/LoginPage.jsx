import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, INICIO_ROL, ROLES, NOMBRE_ROL } from '../../services/staffApi';
import { usuariosConClave } from '../../services/catalogo';
import { IconChart, IconChef, IconTray } from '../../components/Icons';
import styles from './LoginPage.module.css';

const ACCESOS_DEMO = [
  { rol: ROLES.GARZON, icono: IconTray, texto: 'Atender las mesas (lo hace el administrador)' },
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

  const entrar = async (c = correo, p = password, destinoForzado = null) => {
    setEnviando(true);
    setError(null);
    try {
      const { usuario } = await login(c, p);
      const destino = location.state?.desde;
      navigate(destinoForzado ?? (destino && usuario.rol === ROLES.ADMIN ? destino : INICIO_ROL[usuario.rol]), {
        replace: true,
      });
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
    // Primer usuario activo con ese rol (solo para la demostración)
    // En El 10 el administrador también atiende las mesas: si no hay un
    // garzón propio, se entra con el administrador a la vista del garzón.
    const activos = usuariosConClave().filter((x) => x.activo);
    const u =
      activos.find((x) => x.rol === rol) ?? (rol === ROLES.GARZON ? activos.find((x) => x.rol === ROLES.ADMIN) : null);
    if (!u) {
      setError('No hay usuarios activos con ese rol.');
      return;
    }
    setCorreo(u.correo);
    setPassword(u.clave);
    entrar(u.correo, u.clave, INICIO_ROL[rol]);
  };

  return (
    <main className={styles.page}>
      <section className={styles.marca}>
        <p className={styles.logo}>El 10</p>
        <h1>Acceso del personal</h1>
        <p>El garzón, la cocina del carro y la administración ingresan con su correo. Cada rol ve solo lo que necesita.</p>
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
              placeholder="nombre@el10.cl"
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
