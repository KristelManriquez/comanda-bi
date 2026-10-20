import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import MesaLayout from './layouts/MesaLayout';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrderPage from './pages/OrderPage';
import DemoMesasPage from './pages/DemoMesasPage';
import StatusScreen from './components/StatusScreen';

/**
 * Rutas de la aplicación.
 *
 * Comensal (sin login, entra por el QR):
 *   /mesa/:token                    carta
 *   /mesa/:token/carrito            revisar y enviar el pedido
 *   /mesa/:token/pedido/:pedidoId   seguimiento del pedido
 *
 * Próximamente:
 *   /garzon/*   tablero de pedidos en tiempo real (con login)
 *   /admin/*    gestión de carta, mesas, usuarios y dashboard BI (con login)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoMesasPage />} />

        <Route path="/mesa/:token" element={<MesaLayout />}>
          <Route index element={<MenuPage />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="pedido/:pedidoId" element={<OrderPage />} />
        </Route>

        <Route
          path="*"
          element={
            <StatusScreen titulo="Esta página no existe" texto="Escanea el código QR de tu mesa para ver la carta.">
              <Link to="/" className="btn-secondary">
                Ir al inicio
              </Link>
            </StatusScreen>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
