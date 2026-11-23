/**
 * Conexión con la API REST del servidor.
 *
 * Si existe VITE_API_URL (en client/.env.local o en Vercel), la app usa la
 * base de datos real a través del servidor. Si no existe, sigue funcionando
 * como demo con datos simulados en el navegador (store.js).
 */
export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
export const MODO_API = Boolean(API_URL);

const SESION_KEY = 'el10:sesion-personal';

/** JWT del personal guardado al iniciar sesión (o null). */
export function tokenPersonal() {
  try {
    return JSON.parse(sessionStorage.getItem(SESION_KEY))?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * fetch a la API con JSON. Lanza un Error con el mensaje del servidor
 * y su código HTTP en error.status.
 */
export async function http(ruta, { method = 'GET', body, personal = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (personal) {
    const token = tokenPersonal();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    // Sesión del personal vencida o inválida: se vuelve al inicio de sesión
    if (personal && res.status === 401) {
      try {
        sessionStorage.removeItem(SESION_KEY);
      } catch {
        /* nada que borrar */
      }
      window.location.assign('/personal');
    }
    const error = new Error(datos?.error ?? 'Ocurrió un error inesperado');
    error.status = res.status;
    if (datos?.campo) error.campo = datos.campo;
    throw error;
  }
  return datos;
}
