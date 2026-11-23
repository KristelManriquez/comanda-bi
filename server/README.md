# Servidor de Comanda BI

API REST (Express), base de datos PostgreSQL y tiempo real con Socket.IO.
Hoy cubre el flujo del pedido: carta, pedidos del comensal, pantalla de cocina,
vista del garzón (marcar recibido y cerrar cuenta), login del personal con JWT
y registro anónimo de la navegación.

## Puesta en marcha

1. Conecta el proyecto de Neon (la configuración está en `neon.ts` y `.neon`):
   ```bash
   npm i -g neon@latest
   cd server
   neon login                # se abre el navegador para iniciar sesión
   neon deploy               # escribe DATABASE_URL y DATABASE_URL_UNPOOLED en .env.local
   ```
2. Configura y arranca el servidor:
   ```bash
   cp .env.example .env      # escribe un JWT_SECRET largo
   npm install
   npm run db:init           # crea las tablas (conexión directa) y carga la carta, mesas y usuarios de El 10
   npm run dev               # http://localhost:4000/api/health
   ```
3. Conecta el front:
   ```bash
   cd client
   cp .env.example .env.local
   npm install
   npm run dev
   ```

`npm run db:init` borra y vuelve a crear todo: úsalo solo para partir de cero.

## Rutas

| Método | Ruta | Quién | Para qué |
| --- | --- | --- | --- |
| GET | `/api/mesas/:token` | Comensal | Validar el QR de la mesa |
| GET | `/api/carta` | Comensal | Categorías y productos vigentes (sin costo) |
| POST | `/api/pedidos` | Comensal | Enviar un pedido (los precios se toman de la BD) |
| GET | `/api/mesas/:token/pedidos` | Comensal | Pedidos de la cuenta abierta de la mesa |
| GET | `/api/mesas/:token/pedidos/:id` | Comensal | Seguimiento de un pedido de esa mesa |
| POST | `/api/eventos` | Comensal | Evento anónimo de navegación |
| POST | `/api/auth/login` | Personal | Inicio de sesión, entrega un JWT |
| GET | `/api/pedidos?estado=solicitado` | Garzón, cocina | Pedidos por entregar |
| PATCH | `/api/pedidos/:id` | Garzón | Marcar como recibido |
| GET | `/api/mesas-estado` | Garzón | Mesas con su cuenta abierta |
| POST | `/api/cuentas/:id/cerrar` | Garzón | Registrar el pago presencial |
| GET, POST | `/api/admin/categorias` | Administrador | Listar y crear categorías |
| PATCH, DELETE | `/api/admin/categorias/:id` | Administrador | Renombrar o eliminar (sin productos) |
| POST | `/api/admin/categorias/:id/mover` | Administrador | Cambiar el orden en la carta |
| GET, POST | `/api/admin/productos` | Administrador | Listar (con costo) y crear productos |
| PUT | `/api/admin/productos/:id` | Administrador | Editar un producto |
| PATCH | `/api/admin/productos/:id` | Administrador | `{ disponible }` (agotado) o `{ activo }` (retirar / reincorporar) |
| GET, POST | `/api/admin/mesas` | Administrador | Listar y crear mesas |
| PATCH | `/api/admin/mesas/:id` | Administrador | Activar o desactivar |
| POST | `/api/admin/mesas/:id/regenerar-qr` | Administrador | Nuevo token de QR |
| GET, POST | `/api/admin/usuarios` | Administrador | Listar y crear usuarios del personal |
| PUT | `/api/admin/usuarios/:id` | Administrador | Editar (la contraseña solo si se envía) |
| GET | `/api/admin/dashboard?desde&hasta` | Administrador | Cuentas cerradas, pedidos, eventos y catálogo del rango |
| GET | `/api/admin/dashboard/rango` | Administrador | Primera fecha con datos |

Las rutas del personal exigen `Authorization: Bearer <token>`; el administrador puede usarlas todas.

## Tiempo real

Cuando se crea un pedido, se marca como recibido o se cierra una cuenta, el servidor
emite `pedidos:cambio` a la sala `personal` (cocina y garzones, conectados con su JWT)
y a la sala de la mesa (el comensal, conectado con el token del QR). Cada pantalla
vuelve a pedir sus datos a la API. Los cambios de la administración (carta, mesas,
usuarios) avisan a todas las pantallas.
