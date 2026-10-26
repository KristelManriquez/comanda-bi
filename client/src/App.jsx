import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import MesaLayout from './layouts/MesaLayout';
import AdminLayout from './layouts/AdminLayout';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrderPage from './pages/OrderPage';
import DemoMesasPage from './pages/DemoMesasPage';
import LoginPage from './pages/staff/LoginPage';
import CocinaPage from './pages/staff/CocinaPage';
import GarzonPage from './pages/staff/GarzonPage';
import CartaAdminPage from './pages/admin/CartaAdminPage';
import MesasAdminPage from './pages/admin/MesasAdminPage';
import UsuariosAdminPage from './pages/admin/UsuariosAdminPage';
// El dashboard (con Recharts) se carga solo cuando se abre la administración
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));

import RequireRole from './components/RequireRole';
import StatusScreen from './components/StatusScreen';
import { ROLES } from './services/staffApi';

/**
 * Rutas de la aplicación.
 *
 * Comensal (sin login, entra por el QR):
 *   /mesa/:token                    carta
 *   /mesa/:token/carrito            revisar y enviar el pedido
 *   /mesa/:token/pedido/:pedidoId   seguimiento del pedido
 *
 * Personal (con login y control de acceso por rol):
 *   /personal          inicio de sesión
 *   /cocina            pantalla de cocina (solo visualiza)
 *   /garzon            entrega de pedidos y cierre de cuentas
 *   /admin             dashboard de inteligencia de negocio
 *   /admin/carta       productos, precios, costos y disponibilidad
 *   /admin/mesas       mesas y códigos QR
 *   /admin/usuarios    usuarios y roles
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

        <Route path="/personal" element={<LoginPage />} />
        <Route
          path="/cocina"
          element={<RequireRole roles={[ROLES.COCINA]}>{(u) => <CocinaPage usuario={u} />}</RequireRole>}
        />
        <Route
          path="/garzon"
          element={<RequireRole roles={[ROLES.GARZON]}>{(u) => <GarzonPage usuario={u} />}</RequireRole>}
        />
        <Route
          path="/admin"
          element={<RequireRole roles={[ROLES.ADMIN]}>{(u) => <AdminLayout usuario={u} />}</RequireRole>}
        >
          <Route
            index
            element={
              <Suspense fallback={<StatusScreen cargando titulo="Cargando el dashboard" />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route path="carta" element={<CartaAdminPage />} />
          <Route path="mesas" element={<MesasAdminPage />} />
          <Route path="usuarios" element={<UsuariosAdminPage />} />
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
