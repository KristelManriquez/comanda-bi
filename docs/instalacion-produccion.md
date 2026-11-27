# Instalación en ambiente productivo

Comanda BI se publica en tres servicios: la base de datos en **Neon**, la API (Express + Socket.IO) en un servidor de aplicación con soporte de WebSocket (por ejemplo **Render**) y el front en **Vercel**.

## Requisitos
- Cuenta en Neon, en el servidor de aplicación y en Vercel, conectadas al repositorio de GitHub.
- Node.js 20 o superior.

## 1. Base de datos (Neon)
1. En el proyecto de Neon, usar la rama `production` (la rama `test` es solo para las pruebas).
2. Copiar desde **Connect** las dos cadenas: con pooling (`DATABASE_URL`) y directa (`DATABASE_URL_UNPOOLED`). No se guardan en el repositorio.

## 2. Crear las tablas y los datos iniciales (una sola vez)
Desde un computador con el repositorio, con las variables de producción en `server/.env.local`:
```bash
cd server
npm ci
npm run db:init
```
> `db:init` **borra y vuelve a crear** todas las tablas. En producción se ejecuta solo en la primera instalación.

Luego, cambiar la contraseña inicial de las cuentas del personal en Administración › Usuarios.

## 3. API (servidor de aplicación)
Crear un servicio web desde el repositorio:

| Campo | Valor |
|---|---|
| Carpeta raíz | `server` |
| Build | `npm ci` |
| Inicio | `npm start` |
| Variables | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET` (frase larga y aleatoria), `CLIENT_URL=https://comanda-bi.vercel.app` |

El servidor toma el puerto de la variable `PORT` que entrega la plataforma.

## 4. Front (Vercel)
| Campo | Valor |
|---|---|
| Carpeta raíz | `client` |
| Framework | Vite (`npm run build`, salida `dist`) |
| Variable | `VITE_API_URL=https://<dirección-de-la-api>/api` |

`client/vercel.json` redirige todas las rutas a `index.html`. Vercel publica automáticamente cada merge a `main`.

## 5. Verificación
1. `https://<dirección-de-la-api>/api/health` responde `{"status":"ok"}`.
2. Iniciar sesión como administrador y revisar la carta, las mesas y los usuarios.
3. Descargar el QR de una mesa, escanearlo con un teléfono y enviar un pedido.
4. Comprobar que llega a la cocina, entregarlo como garzón, cerrar la cuenta y ver la venta en el dashboard.
