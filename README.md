# Comanda BI · El 10

Sistema web de pedidos por código QR con un dashboard de inteligencia de negocio, desarrollado para **El 10, El carro futbolero**: un foodtruck de hamburguesas que atiende en eventos e instala mesas para sus clientes. Su equipo es de tres personas: dos en la cocina del carro y una que atiende las mesas como garzón y además administra el negocio.

Proyecto de título de Ingeniería en Computación e Informática (UNAB). La carta parte del Instagram de El 10 (@el10_carrofutbolero); precios, costos y productos adicionales son referenciales para la demostración.

## Estructura

```
comanda-bi/
├── client/                  Frontend (React + Vite)
│   └── src/
│       ├── components/      Piezas reutilizables de interfaz
│       ├── context/         Estado global (carrito)
│       ├── data/            Datos iniciales de El 10 (carta, mesas, usuarios)
│       ├── hooks/           useEnVivo: recarga datos al cambiar
│       ├── layouts/         MesaLayout (QR de la mesa) y AdminLayout
│       ├── pages/           Comensal, staff/ (login, garzón, cocina) y admin/ (dashboard)
│       ├── services/        api.js, staffApi.js, biApi.js y store.js
│       └── utils/           Formato de pesos, estados del pedido
│
└── server/                  Backend (Node.js + Express, API REST)
    └── src/
        ├── routes/          Definición de endpoints
        ├── controllers/     Reciben la petición y responden
        ├── services/        Lógica de negocio
        ├── db/              Conexión y consultas a PostgreSQL
        ├── middlewares/     Autenticación JWT, validaciones
        └── sockets/         Pedidos en tiempo real (Socket.IO)
```

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
# Frontend
cd client
npm install
npm run dev
```

Abre http://localhost:5173 y elige una mesa de prueba (simula escanear su QR).

Para probar en tu teléfono, conéctalo a la misma red Wi-Fi que tu computador y abre la dirección **Network** que muestra Vite al iniciar (por ejemplo `http://192.168.1.20:5173`).

```bash
# Backend (API, base de datos en Neon y tiempo real): ver server/README.md
cd server
npm install
npm run db:init
npm run dev
```

## Estado actual

Con `VITE_API_URL` (en `client/.env.local`), **todo** usa el servidor, la base de datos PostgreSQL y Socket.IO: carta, pedidos, cocina, garzón, cierre de cuenta, administración (carta, mesas, usuarios) y dashboard. No hay pedidos ni ventas inventadas: `npm run db:init` carga solo la carta, las mesas y las cuentas del personal, y los indicadores se calculan con lo que ocurre en la aplicación.

Sin `VITE_API_URL`, el frontend funciona como demo en el navegador (`localStorage`), con los mismos datos iniciales y sin historial.

**Comensal** (`/mesa/:token`, teléfono, sin registro)

- Carta por categorías, ficha de producto con notas, carrito por mesa.
- Envío del pedido y seguimiento: solicitado → recibido (se actualiza al instante).
- Registro anónimo de eventos (ver carta, ver detalle, agregar, enviar) para el embudo.

**Personal** (`/personal`, inicio de sesión por rol)

| Rol | Ruta | Qué hace |
|---|---|---|
| Garzón | `/garzon` | Marca pedidos como recibidos, ve las mesas y cierra cuentas con pago presencial en el carro. En El 10 lo usa el administrador. |
| Cocina | `/cocina` | Pantalla de solo lectura, compartida por las dos personas de la cocina del carro, con los pedidos solicitados y su tiempo de espera. |
| Administración | `/admin` | Dashboard BI; carta (crear, editar, retirar productos y categorías, con precio, costo y disponibilidad); mesas (crear, activar o desactivar, regenerar y descargar el QR); usuarios (crear y editar con su rol). |

Cuentas iniciales (contraseña `el10-2026`, se puede cambiar en Administración › Usuarios): `admin@el10.cl` (Diego, administrador y garzón) y `cocina@el10.cl` (cocina). El acceso rápido «Garzón» entra con el administrador a la vista del garzón. Con el servidor, la página de inicio muestra los enlaces de las mesas solo si hay una sesión de administrador en esa pestaña; también están en Administración › Mesas y QR («Abrir carta de la mesa»).

**Dashboard de inteligencia de negocio** (`/admin`)

- Ventas: ventas, cuentas, pedidos, ticket promedio y tiempo de entrega (con variación frente al periodo anterior), ventas por día, por franja horaria y por categoría, y productos más y menos vendidos.
- Embudo de la carta: global y por producto, con alertas de productos con mucho interés y poca conversión.
- Ingeniería de menú (Kasavana y Smith) ampliada con la conversión del embudo.
- Solo datos reales: las ventas cuentan cuando el garzón registra el pago y cierra la cuenta; el embudo usa los eventos anónimos de navegación. El servidor entrega los datos con `GET /api/admin/dashboard?desde&hasta` y el front calcula los indicadores.

**Cómo probar el flujo completo**

1. `cd server && npm run db:init && npm run dev` y `cd client && npm run dev` (con `VITE_API_URL` en `client/.env.local`).
2. Pestaña 1: entra como `admin@el10.cl` → Mesas y QR → «Abrir carta de la mesa» (o escanea el QR con el teléfono).
3. En la carta, abre productos, agrega y solicita el pedido.
4. Pestaña 2 (u otro dispositivo): entra como `cocina@el10.cl` y ve el pedido.
5. Pestaña 1: «Atender mesas (garzón)» → «Entregado: marcar como recibido». El comensal ve «Recibido».
6. Mesas → la mesa → «Registrar pago y cerrar cuenta».
7. Dashboard: ventas, embudo e ingeniería de menú con ese pedido.

**Próximos pasos**

1. Publicar el servidor y conectar el sitio de Vercel.
2. Confirmar precios y costos con El 10 y subir fotos de los productos.

## Mesas de prueba

| Mesa | Token QR | URL |
|---|---|---|
| 1 | m1-7f3a9c | /mesa/m1-7f3a9c |
| 2 | m2-b81e40 | /mesa/m2-b81e40 |
| 3 | m3-c29d17 | /mesa/m3-c29d17 |
| 4 | m4-e05b62 | /mesa/m4-e05b62 |
| 5 | m5-a4f8d3 | /mesa/m5-a4f8d3 |
| 6 | m6-91c7aa | inactiva (para probar el error) |
