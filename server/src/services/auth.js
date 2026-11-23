import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { errorHttp } from './pedidos.js';

const DURACION = '12h'; // un turno

export function secreto() {
  if (!process.env.JWT_SECRET) throw new Error('Falta JWT_SECRET en server/.env');
  return process.env.JWT_SECRET;
}

/** Valida correo y contraseña con bcrypt y entrega un JWT firmado con el id y el rol. */
export async function login(correo, password) {
  const { rows } = await query(
    'SELECT id, nombre, correo, rol, activo, contrasena_hash FROM usuario WHERE correo = $1',
    [String(correo ?? '').trim().toLowerCase()]
  );
  const u = rows[0];
  const valida = u && u.activo && (await bcrypt.compare(String(password ?? ''), u.contrasena_hash));
  // Mensaje genérico: no revela si el correo existe
  if (!valida) throw errorHttp(401, 'Correo o contraseña incorrectos');
  const usuario = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, activo: u.activo };
  const token = jwt.sign({ sub: u.id, rol: u.rol, nombre: u.nombre }, secreto(), { expiresIn: DURACION });
  return { token, usuario };
}

/** Devuelve { id, rol, nombre } si el token es válido; si no, null. */
export function verificarToken(token) {
  try {
    const datos = jwt.verify(token, secreto());
    return { id: datos.sub, rol: datos.rol, nombre: datos.nombre };
  } catch {
    return null;
  }
}
