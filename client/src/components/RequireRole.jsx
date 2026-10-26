import { Navigate, useLocation } from 'react-router-dom';
import { getSesion, ROLES } from '../services/staffApi';

/**
 * Protege las vistas del personal según el rol (control de acceso por rol, RNF03).
 * El administrador puede entrar a todas las vistas.
 */
export default function RequireRole({ roles, children }) {
  const sesion = getSesion();
  const location = useLocation();
  if (!sesion) return <Navigate to="/personal" replace state={{ desde: location.pathname }} />;
  const rol = sesion.usuario.rol;
  if (rol !== ROLES.ADMIN && !roles.includes(rol)) {
    return <Navigate to="/personal" replace state={{ sinPermiso: true }} />;
  }
  return children(sesion.usuario);
}
