-- Esquema de Comanda BI (PostgreSQL)
-- Corresponde al modelo de datos del informe (9 entidades).
-- Se puede ejecutar varias veces: borra y vuelve a crear todo.

DROP TABLE IF EXISTS evento_navegacion, historial_estado_pedido, detalle_pedido,
  pedido, cuenta, mesa, producto, categoria, usuario CASCADE;

CREATE TABLE usuario (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(60)  NOT NULL,
  correo          VARCHAR(120) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(100) NOT NULL,
  rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('administrador', 'garzon', 'cocina')),
  activo          BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE categoria (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  orden  INT         NOT NULL,
  icono  VARCHAR(20)
);

CREATE TABLE producto (
  id           SERIAL PRIMARY KEY,
  categoria_id INT          REFERENCES categoria(id) ON DELETE SET NULL,
  nombre       VARCHAR(60)  NOT NULL,
  descripcion  VARCHAR(160) NOT NULL DEFAULT '',
  precio       INT          NOT NULL CHECK (precio > 0),
  costo        INT          NOT NULL CHECK (costo >= 0),
  imagen_url   TEXT,
  disponible   BOOLEAN      NOT NULL DEFAULT TRUE,
  destacado    BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Los productos no se borran: se retiran de la carta para conservar sus ventas
  activo       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE mesa (
  id       SERIAL PRIMARY KEY,
  numero   INT         NOT NULL UNIQUE,
  token_qr VARCHAR(40) NOT NULL UNIQUE,
  activa   BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE cuenta (
  id         SERIAL PRIMARY KEY,
  mesa_id    INT         NOT NULL REFERENCES mesa(id),
  garzon_id  INT         REFERENCES usuario(id),
  estado     VARCHAR(10) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  total      INT         NOT NULL DEFAULT 0,
  abierta_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en TIMESTAMPTZ
);
-- Una mesa puede tener solo una cuenta abierta a la vez
CREATE UNIQUE INDEX cuenta_abierta_por_mesa ON cuenta (mesa_id) WHERE estado = 'abierta';

CREATE TABLE pedido (
  id        SERIAL PRIMARY KEY,
  cuenta_id INT         NOT NULL REFERENCES cuenta(id),
  estado    VARCHAR(12) NOT NULL DEFAULT 'solicitado' CHECK (estado IN ('solicitado', 'recibido')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedido_estado ON pedido (estado);

CREATE TABLE detalle_pedido (
  id              SERIAL PRIMARY KEY,
  pedido_id       INT          NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  producto_id     INT          NOT NULL REFERENCES producto(id),
  cantidad        INT          NOT NULL CHECK (cantidad BETWEEN 1 AND 50),
  -- El precio se copia al momento del pedido: si cambia la carta, las ventas pasadas no cambian
  precio_unitario INT          NOT NULL,
  nota            VARCHAR(140) NOT NULL DEFAULT ''
);

CREATE TABLE historial_estado_pedido (
  id         SERIAL PRIMARY KEY,
  pedido_id  INT         NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  usuario_id INT         REFERENCES usuario(id), -- NULL cuando lo crea el comensal
  estado     VARCHAR(12) NOT NULL,
  fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evento_navegacion (
  id          SERIAL PRIMARY KEY,
  sesion_id   UUID        NOT NULL, -- aleatorio, sin datos personales (Ley N.° 21.719)
  mesa_id     INT         REFERENCES mesa(id),
  producto_id INT         REFERENCES producto(id),
  tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('ver_carta', 'ver_detalle', 'agregar', 'enviar')),
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
