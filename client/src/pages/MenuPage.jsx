import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getCarta, getPedidosDeMesa } from '../services/api';
import { useCart } from '../context/CartContext';
import { ESTADOS_PEDIDO } from '../utils/pedido';
import MenuHeader from '../components/MenuHeader';
import CategoryTabs from '../components/CategoryTabs';
import FeaturedStrip from '../components/FeaturedStrip';
import ProductItem from '../components/ProductItem';
import ProductSheet from '../components/ProductSheet';
import CartBar from '../components/CartBar';
import ActiveOrderBanner from '../components/ActiveOrderBanner';
import Toast from '../components/Toast';
import StatusScreen from '../components/StatusScreen';
import styles from './MenuPage.module.css';

/**
 * Ejecuta `callback` cuando la ventana deja de desplazarse
 * (150 ms sin eventos de scroll). Funciona en todos los navegadores,
 * incluido Safari, que aún no soporta el evento "scrollend".
 * Devuelve una función para cancelar la espera.
 */
function alTerminarScroll(callback) {
  let timer;
  const terminar = () => {
    window.removeEventListener('scroll', reiniciar);
    callback();
  };
  const reiniciar = () => {
    clearTimeout(timer);
    timer = setTimeout(terminar, 150);
  };
  window.addEventListener('scroll', reiniciar, { passive: true });
  reiniciar();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('scroll', reiniciar);
  };
}

export default function MenuPage() {
  const { mesa, token } = useOutletContext();
  const { agregar, cantidadDeProducto, cantidadTotal } = useCart();

  const [carta, setCarta] = useState(null);
  const [error, setError] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [productoAbierto, setProductoAbierto] = useState(null);
  const [toast, setToast] = useState(null);
  const [pedidoActivo, setPedidoActivo] = useState(null);

  const seccionesRef = useRef({});
  const barraRef = useRef(null);
  const scrollProgramado = useRef(false);
  const cancelarEspera = useRef(null);

  const altoBarra = () => barraRef.current?.offsetHeight ?? 0;

  /* ---------- Carga de datos ---------- */
  const cargarCarta = useCallback(() => {
    return getCarta()
      .then((data) => {
        setCarta(data);
        setCategoriaActiva(data.categorias[0]?.id ?? null);
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    cargarCarta();
  }, [cargarCarta]);

  const reintentar = () => {
    setError(null);
    cargarCarta();
  };

  // Pedido en curso de esta mesa (luego llegará por Socket.IO en vez de consultar cada 5 s)
  useEffect(() => {
    const revisar = () =>
      getPedidosDeMesa(token).then((pedidos) =>
        setPedidoActivo(pedidos.find((p) => p.estado !== ESTADOS_PEDIDO.ENTREGADO) ?? null)
      );
    revisar();
    const id = setInterval(revisar, 5000);
    return () => clearInterval(id);
  }, [token]);

  /* ---------- Resaltar la categoría visible al hacer scroll ----------
     La categoría activa es la última sección cuyo inicio ya pasó por
     debajo de la barra de categorías. Se calcula como máximo una vez
     por frame (requestAnimationFrame) para no afectar la fluidez. */
  useEffect(() => {
    if (!carta) return;
    let frame = 0;

    const calcular = () => {
      frame = 0;
      // Mientras la página se desplaza sola hacia una categoría tocada, no recalcular
      if (scrollProgramado.current) return;

      const limite = altoBarra() + 48;
      let actual = carta.categorias[0]?.id;
      for (const c of carta.categorias) {
        const el = seccionesRef.current[c.id];
        if (el && el.getBoundingClientRect().top <= limite) actual = c.id;
      }
      // Al llegar al final de la página se marca la última categoría,
      // aunque su título no alcance a subir hasta la barra.
      const alFinal =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (alFinal) actual = carta.categorias.at(-1)?.id;

      setCategoriaActiva((prev) => (prev === actual ? prev : actual));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(calcular);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [carta]);

  // Limpia cualquier espera pendiente al salir de la página
  useEffect(() => () => cancelarEspera.current?.(), []);

  const irACategoria = (id) => {
    const seccion = seccionesRef.current[id];
    if (!seccion) return;

    setCategoriaActiva(id);
    scrollProgramado.current = true;

    // Posición exacta: inicio de la sección justo bajo la barra fija
    const destino = seccion.getBoundingClientRect().top + window.scrollY - altoBarra();
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, destino), behavior: reducirMovimiento ? 'auto' : 'smooth' });

    // Se vuelve a seguir el scroll del usuario cuando el desplazamiento termina
    cancelarEspera.current?.();
    cancelarEspera.current = alTerminarScroll(() => {
      scrollProgramado.current = false;
    });
  };

  /* ---------- Acciones ---------- */
  const mostrarToast = (texto) => setToast({ id: Date.now(), texto });

  const agregarAlPedido = (producto, cantidad = 1, nota = '') => {
    agregar(producto, cantidad, nota);
    mostrarToast(cantidad > 1 ? `${cantidad} × ${producto.nombre} agregados` : `${producto.nombre} agregado`);
  };

  const iconoPorCategoria = useMemo(() => {
    const mapa = {};
    carta?.categorias.forEach((c) => (mapa[c.id] = c.icono));
    return mapa;
  }, [carta]);
  const iconoDe = (p) => iconoPorCategoria[p.categoria_id];

  /* ---------- Render ---------- */
  if (error) {
    return (
      <StatusScreen titulo="No pudimos cargar la carta" texto="Revisa tu conexión a internet e inténtalo otra vez.">
        <button type="button" className="btn-primary" onClick={reintentar}>
          Reintentar
        </button>
      </StatusScreen>
    );
  }

  if (!carta) return <StatusScreen cargando titulo="Cargando la carta" />;

  const destacados = carta.categorias.flatMap((c) => c.productos).filter((p) => p.destacado && p.disponible);

  return (
    <>
      <MenuHeader restaurante={carta.restaurante} mesa={mesa} />
      <CategoryTabs
        ref={barraRef}
        categorias={carta.categorias}
        activa={categoriaActiva}
        onSelect={irACategoria}
      />

      <main className={styles.main}>
        <ActiveOrderBanner pedido={pedidoActivo} to={`/mesa/${token}/pedido/${pedidoActivo?.id}`} />

        <FeaturedStrip productos={destacados} iconoDe={iconoDe} onOpen={setProductoAbierto} />

        {carta.categorias.map((categoria) => (
          <section
            key={categoria.id}
            ref={(el) => (seccionesRef.current[categoria.id] = el)}
            data-categoria={categoria.id}
            className={styles.seccion}
            aria-labelledby={`cat-${categoria.id}`}
          >
            <h2 id={`cat-${categoria.id}`} className={styles.categoriaTitulo}>
              {categoria.nombre}
            </h2>
            <ul className={styles.lista}>
              {categoria.productos.map((producto) => (
                <ProductItem
                  key={producto.id}
                  producto={producto}
                  icono={categoria.icono}
                  enCarrito={cantidadDeProducto(producto.id)}
                  onOpen={setProductoAbierto}
                  onQuickAdd={(p) => agregarAlPedido(p)}
                />
              ))}
            </ul>
          </section>
        ))}

        <p className={styles.pie}>
          Precios en pesos chilenos, IVA incluido. El pago se hace en la mesa con el garzón.
        </p>
      </main>

      <ProductSheet
        producto={productoAbierto}
        icono={productoAbierto ? iconoDe(productoAbierto) : null}
        onClose={() => setProductoAbierto(null)}
        onAdd={agregarAlPedido}
      />
      <Toast mensaje={toast} conCarrito={cantidadTotal > 0} />
      <CartBar to={`/mesa/${token}/carrito`} />
    </>
  );
}
