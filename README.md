# Fork QR

Sistema web de pedidos por código QR para restaurantes chilenos, con un dashboard de inteligencia de negocio para el administrador.

Proyecto de título de Ingeniería en Informática. Restaurante de prueba: **Fork**.

## Estructura

```
fork-qr/
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
# Backend (por ahora solo responde /api/health)
cd server
cp .env.example .env
npm install
npm run dev
```

## Estado actual

Todo el frontend funciona con datos simulados guardados en `localStorage`, así que las vistas pueden abrirse en pestañas distintas del mismo navegador y comparten los pedidos en tiempo real. Al conectar el backend solo cambian los archivos de `client/src/services/`.

**Comensal** (`/mesa/:token`, teléfono, sin registro)

- Carta por categorías, ficha de producto con notas, carrito por mesa.
- Envío del pedido y seguimiento: solicitado → recibido (se actualiza al instante).
- Registro anónimo de eventos (ver carta, ver detalle, agregar, enviar) para el embudo.

**Personal** (`/personal`, inicio de sesión por rol)

| Rol | Ruta | Qué hace |
|---|---|---|
| Garzón | `/garzon` | Marca pedidos como recibidos, ve las mesas y cierra cuentas con pago presencial. |
| Cocina | `/cocina` | Pantalla de solo lectura con los pedidos solicitados y su tiempo de espera. |
| Administración | `/admin` | Dashboard BI; carta (crear, editar, retirar productos y categorías, con precio, costo y disponibilidad); mesas (crear, activar o desactivar, regenerar y descargar el QR); usuarios (crear y editar con su rol). |

Usuarios de demostración (contraseña `fork2026`): `camila@fork.cl` (garzón), `cocina@fork.cl` (cocina) y `admin@fork.cl` (administración). La página de inicio tiene accesos rápidos y botones para **cargar pedidos de ejemplo** (mantiene la carta, mesas y usuarios editados) o **reiniciar la demo** (vuelve todo a los datos iniciales).

**Dashboard de inteligencia de negocio** (`/admin`)

- Ventas: ventas, cuentas, pedidos, ticket promedio y tiempo de entrega (con variación frente al periodo anterior), ventas por día, por franja horaria y por categoría, y productos más y menos vendidos.
- Embudo de la carta: global y por producto, con alertas de productos con mucho interés y poca conversión.
- Ingeniería de menú (Kasavana y Smith) ampliada con la conversión del embudo.
- Usa 12 semanas de operación simulada de Fork (`client/src/data/historialSimulado.js`) más lo registrado hoy en la app.

**Próximos pasos**

1. Modelo de datos en PostgreSQL y endpoints reales (carta, pedidos, cuentas, eventos, dashboard).
2. Autenticación con JWT y bcrypt en el backend.
3. Tiempo real con Socket.IO en lugar de `localStorage`.
4. Subida de fotos de los productos.

## Mesas de prueba

| Mesa | Token QR | URL |
|---|---|---|
| 1 | m1-7f3a9c | /mesa/m1-7f3a9c |
| 2 | m2-b81e40 | /mesa/m2-b81e40 |
| 3 | m3-c29d17 | /mesa/m3-c29d17 |
| 4 | m4-e05b62 | /mesa/m4-e05b62 |
| 5 | m5-a4f8d3 | /mesa/m5-a4f8d3 |
| 6 | m6-91c7aa | inactiva (para probar el error) |
