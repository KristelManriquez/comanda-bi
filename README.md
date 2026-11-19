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
│       ├── data/            Datos simulados mientras no existe el backend
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

Sin la variable `VITE_API_URL`, el frontend funciona como demo con datos simulados guardados en `localStorage` (las pestañas del mismo navegador comparten los pedidos). Con `VITE_API_URL`, el flujo del pedido (carta, pedidos, cocina, garzón y cierre de cuenta) usa el servidor, la base de datos y Socket.IO. La administración y el dashboard todavía usan los datos simulados.

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

Usuarios de demostración (contraseña `el10-2026`): `admin@el10.cl` (administración y garzón) y `cocina@el10.cl` (cocina). El acceso rápido «Garzón» entra con el administrador a la vista del garzón. La página de inicio tiene accesos rápidos y botones para **cargar pedidos de ejemplo** (mantiene la carta, mesas y usuarios editados) o **reiniciar la demo** (vuelve todo a los datos iniciales).

**Dashboard de inteligencia de negocio** (`/admin`)

- Ventas: ventas, cuentas, pedidos, ticket promedio y tiempo de entrega (con variación frente al periodo anterior), ventas por día, por franja horaria y por categoría, y productos más y menos vendidos.
- Embudo de la carta: global y por producto, con alertas de productos con mucho interés y poca conversión.
- Ingeniería de menú (Kasavana y Smith) ampliada con la conversión del embudo.
- Usa 12 semanas de eventos simulados de El 10 (viernes, sábado y domingo; `client/src/data/historialSimulado.js`) más lo registrado hoy en la app. Incluye a propósito dos productos con mucho interés y poca conversión (Veggie y Papas cheddar y tocino) para probar el embudo.

**Próximos pasos**

1. Conectar la administración (carta, mesas, usuarios) a la base de datos.
2. Calcular el dashboard con consultas SQL sobre la base de datos.
3. Publicar el servidor y conectar el sitio de Vercel.
4. Subir fotos de los productos de El 10.

## Mesas de prueba

| Mesa | Token QR | URL |
|---|---|---|
| 1 | m1-7f3a9c | /mesa/m1-7f3a9c |
| 2 | m2-b81e40 | /mesa/m2-b81e40 |
| 3 | m3-c29d17 | /mesa/m3-c29d17 |
| 4 | m4-e05b62 | /mesa/m4-e05b62 |
| 5 | m5-a4f8d3 | /mesa/m5-a4f8d3 |
| 6 | m6-91c7aa | inactiva (para probar el error) |
