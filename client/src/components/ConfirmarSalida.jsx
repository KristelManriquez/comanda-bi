import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialogo from '../pages/admin/ui/Dialogo';
import { logout } from '../services/staffApi';

/**
 * Confirmación antes de cerrar la sesión del personal.
 * Cerrar sesión por error obliga a escribir de nuevo el correo y la contraseña en
 * pleno servicio, así que la acción destacada (y la que recibe el foco) es quedarse.
 */
export default function ConfirmarSalida({ usuario, onClose }) {
  const navigate = useNavigate();
  const quedarse = useRef(null);
  // El diálogo se abre (showModal) en el efecto del hijo; después se enfoca "Seguir conectado"
  useEffect(() => quedarse.current?.focus(), []);
  const salir = () => {
    logout();
    navigate('/personal');
  };

  return (
    <Dialogo
      titulo="¿Estás seguro que deseas salir?"
      onClose={onClose}
      pie={
        <>
          <button type="button" className="btn-secondary" onClick={salir}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={onClose} ref={quedarse}>
            Sí, cerrar sesión
          </button>
        </>
      }
    >
    </Dialogo>
  );
}
