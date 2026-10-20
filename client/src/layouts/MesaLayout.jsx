import { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { getMesaPorToken } from '../services/api';
import StatusScreen from '../components/StatusScreen';

/**
 * Todas las rutas del comensal cuelgan de /mesa/:token.
 * El token viene en el QR impreso en la mesa. Aquí se valida
 * una sola vez y se comparte la mesa y el carrito con las páginas hijas.
 */
export default function MesaLayout() {
  const { token } = useParams();
  const [estado, setEstado] = useState({ cargando: true, mesa: null, error: null });

  useEffect(() => {
    let activo = true;
    getMesaPorToken(token)
      .then((mesa) => activo && setEstado({ cargando: false, mesa, error: null }))
      .catch((error) => activo && setEstado({ cargando: false, mesa: null, error }));
    return () => {
      activo = false;
    };
  }, [token]);

  if (estado.cargando) return <StatusScreen cargando titulo="Abriendo la carta" />;

  if (estado.error) {
    return (
      <StatusScreen
        titulo="Este código no corresponde a una mesa"
        texto="Vuelve a escanear el QR de tu mesa o pídele ayuda al garzón."
      />
    );
  }

  return (
    <CartProvider tokenMesa={token}>
      <Outlet context={{ mesa: estado.mesa, token }} />
    </CartProvider>
  );
}
