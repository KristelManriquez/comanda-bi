import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../services/staffApi';
import { IconChart, IconChef, IconLogout, IconMenuBook, IconQr, IconTray, IconUsers } from '../components/Icons';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin', end: true, texto: 'Dashboard', icono: IconChart },
  { to: '/admin/carta', texto: 'Carta', icono: IconMenuBook },
  { to: '/admin/mesas', texto: 'Mesas y QR', icono: IconQr },
  { to: '/admin/usuarios', texto: 'Usuarios', icono: IconUsers },
];

const OPERACION = [
  { to: '/cocina', texto: 'Pantalla de cocina', icono: IconChef },
  { to: '/garzon', texto: 'Atender mesas (garzón)', icono: IconTray },
];

/** Estructura del módulo de administración (solo rol administrador). */
export default function AdminLayout({ usuario }) {
  const navigate = useNavigate();
  const salir = () => {
    logout();
    navigate('/personal');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.marca}>
          <span className={styles.logo}>El 10</span>
          <span className={styles.producto}>Comanda BI</span>
        </div>
        <nav className={styles.nav} aria-label="Administración">
          <p className={styles.grupo}>Administración</p>
          {NAV.map(({ to, end, texto, icono: Icono }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? styles.activo : undefined)}>
              <Icono />
              <span>{texto}</span>
            </NavLink>
          ))}
          <p className={styles.grupo}>Operación en vivo</p>
          {OPERACION.map(({ to, texto, icono: Icono }) => (
            <NavLink key={to} to={to}>
              <Icono />
              <span>{texto}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.usuario}>
          <span className={styles.avatar}>{usuario.nombre[0]}</span>
          <span className={styles.usuarioTexto}>
            <strong>{usuario.nombre}</strong>
            <small>Administración y garzón</small>
          </span>
          <button type="button" onClick={salir} className={styles.salir}>
            <IconLogout />
            <span className="visually-hidden">Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className={styles.contenido}>
        <Outlet context={{ usuario }} />
      </div>
    </div>
  );
}
