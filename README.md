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
│       ├── layouts/         MesaLayout: valida el QR de la mesa
│       ├── pages/           Pantallas (carta, carrito, seguimiento)
│       ├── services/        api.js: único punto de acceso a datos
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

**Módulo comensal (listo, con datos simulados)**

- Entrada por QR: `/mesa/:token`. Un token inválido muestra un aviso.
- Carta por categorías con barra fija que sigue el scroll.
- Sección "Lo más pedido" (luego se alimentará con datos del BI).
- Ficha de producto con nota para la cocina y cantidad.
- Productos agotados visibles pero no seleccionables.
- Carrito guardado por mesa (sobrevive a recargas).
- Envío del pedido y seguimiento de estado: recibido, en preparación, listo, entregado.

Mientras no exista el backend, `client/src/services/api.js` simula la API y la cocina (el estado avanza solo con el tiempo). Al conectar el backend solo cambia ese archivo.

**Próximos pasos**

1. Modelo de datos en PostgreSQL y endpoints reales de carta y pedidos.
2. Módulo garzón/cocina con pedidos en tiempo real (Socket.IO).
3. Módulo de administración (login, CRUD de carta, mesas y usuarios, generación de QR).
4. Dashboard de inteligencia de negocio.

## Mesas de prueba

| Mesa | Token QR | URL |
|---|---|---|
| 1 | m1-7f3a9c | /mesa/m1-7f3a9c |
| 2 | m2-b81e40 | /mesa/m2-b81e40 |
| 3 | m3-c29d17 | /mesa/m3-c29d17 |
| 4 | m4-e05b62 | /mesa/m4-e05b62 |
| 5 | m5-a4f8d3 | /mesa/m5-a4f8d3 |
| 6 | m6-91c7aa | inactiva (para probar el error) |
