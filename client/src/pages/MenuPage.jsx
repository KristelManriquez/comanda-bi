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
  const scrollManual = useRef(false);

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

  /* ---------- Resaltar la categoría visible al hacer scroll ---------- */
  useEffect(() => {
    if (!carta) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollManual.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setCategoriaActiva(Number(visible[0].target.dataset.categoria));
        }
      },
      { rootMargin: '-72px 0px -65% 0px' }
    );
    Object.values(seccionesRef.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [carta]);

  const irACategoria = (id) => {
    setCategoriaActiva(id);
    scrollManual.current = true;
    seccionesRef.current[id]?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setTimeout(() => (scrollManual.current = false), 700);
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
      <CategoryTabs categorias={carta.categorias} activa={categoriaActiva} onSelect={irACategoria} />

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
