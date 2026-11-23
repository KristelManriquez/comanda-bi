import { verificarToken } from '../services/auth.js';

/**
 * Exige un JWT válido (cabecera Authorization: Bearer <token>) y uno de los roles indicados.
 * El administrador puede usar todas las rutas del personal.
 */
export function requiereRol(...roles) {
  return (req, res, next) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    const usuario = tipo === 'Bearer' ? verificarToken(token) : null;
    if (!usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });
    if (usuario.rol !== 'administrador' && !roles.includes(usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    req.usuario = usuario;
    next();
  };
}
