# Notas de versión · Comanda BI

## v0.6.0 · Línea base del MPV (26 de noviembre de 2026)

Primera línea base del producto mínimo viable para **El 10, El carro futbolero**. Cubre el flujo completo de una mesa, desde que el comensal escanea el QR hasta que la venta aparece en el dashboard, con datos reales en PostgreSQL (Neon).

### Incluye

**Comensal (RF01 a RF05)**
- Acceso a la carta con el QR de la mesa, sin registro.
- Carta por categorías, detalle del producto, pedido con cantidades y notas.
- Varios pedidos en la cuenta abierta de la mesa y estado en tiempo real (solicitado → recibido).
- Opción obligatoria en los productos que la requieren: marca de la bebida en lata y de los combos, sabor del jugo, agua con o sin gas. Sin elegirla no se puede agregar al pedido, y la cocina la ve destacada.

**Garzón y cocina (RF06 a RF08)**
- Inicio de sesión por rol (JWT y bcrypt).
- Pantalla de cocina con los pedidos solicitados en tiempo real (Socket.IO).
- Vista del garzón: mesas con su consumo, entrega del pedido, pago presencial y cierre de la cuenta.

**Administración (RF09 y RF10)**
- Carta: categorías y productos con precio, costo, disponibilidad (agotados) y opción obligatoria (marca, sabor).
- Mesas con QR aleatorio (crear, activar o desactivar, regenerar) y usuarios con su rol.
- El administrador vuelve al panel desde las vistas de garzón y cocina; cerrar sesión pide confirmación.

**Dashboard de inteligencia de negocio (RF11 y RF12)**
- Ventas, cuentas, ticket promedio y tiempo de entrega, por día, franja y categoría, con filtro de fechas.
- Embudo de la carta con navegación anónima e ingeniería de menú ampliada con la conversión.

### Calidad
- 13 pruebas unitarias (Vitest), 27 de integración (Vitest + Supertest sobre una base de pruebas) y 6 de sistema (Playwright).
- Latencia del pedido a la cocina: 6 ms; datos del dashboard: 5 ms (ambiente local).
- Las ventas del dashboard coinciden con una consulta SQL de control (diferencia 0).

### Cambios respecto del plan
- El pedido tiene dos estados (solicitado y recibido); el tiempo de entrega se mide entre ambos.
- El dashboard usa solo datos reales; no hay datos simulados.
- El aviso sonoro en la cocina quedó fuera del alcance.

### Pendiente para v1.0.0 (Hito 3)
- Publicar la API y Socket.IO y conectar el sitio de Vercel a ella.
- Prueba de usabilidad (SUS) con El 10 y medición del OE4 en un evento real.
- Manual de usuario.

### Instalación
Ver [docs/instalacion-produccion.md](docs/instalacion-produccion.md).
