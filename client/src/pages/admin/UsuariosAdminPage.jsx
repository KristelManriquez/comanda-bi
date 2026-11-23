import { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { NOMBRE_ROL, ROLES } from '../../services/staffApi';
import { getUsuariosAdmin, guardarUsuario } from '../../services/catalogo';
import { useEnVivo } from '../../hooks/useEnVivo';
import Dialogo, { Campo, Casilla } from './ui/Dialogo';
import Aviso from './ui/Aviso';
import { useAviso } from './ui/useAviso';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';
import f from './ui/Formulario.module.css';

const DESCRIPCION_ROL = {
  [ROLES.GARZON]: 'Entrega pedidos y cierra cuentas.',
  [ROLES.COCINA]: 'Solo visualiza los pedidos solicitados.',
  [ROLES.ADMIN]: 'Dashboard, carta, mesas y usuarios.',
};

function UsuarioForm({ inicial, idActual, onClose, onGuardado }) {
  const nuevo = !inicial.id;
  const [datos, setDatos] = useState({ ...inicial, clave: '' });
  const [error, setError] = useState(null);
  const set = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e?.target ? e.target.value : e }));
    // El mensaje de error desaparece apenas se corrige el campo
    setError((er) => (er?.campo === campo ? null : er));
  };
  const err = (campo) => (error?.campo === campo ? error.message : null);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await guardarUsuario(datos, idActual);
      onGuardado(nuevo ? `Usuario ${datos.nombre.trim()} creado` : 'Usuario actualizado');
    } catch (er) {
      setError(er);
    }
  };

  return (
    <Dialogo
      titulo={nuevo ? 'Nuevo usuario' : 'Editar usuario'}
      bajada="Solo el personal tiene cuenta. El comensal nunca se registra."
      onClose={onClose}
      pie={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-usuario" className="btn-primary">
            Guardar usuario
          </button>
        </>
      }
    >
      <form id="form-usuario" onSubmit={guardar} className={f.cuerpo} style={{ padding: 0 }} noValidate>
        <Campo etiqueta="Nombre" error={err('nombre')}>
          <input value={datos.nombre} onChange={set('nombre')} maxLength={60} autoFocus />
        </Campo>
        <Campo etiqueta="Correo" error={err('correo')}>
          <input type="email" value={datos.correo} onChange={set('correo')} autoComplete="off" />
        </Campo>
        <Campo etiqueta="Rol" error={err('rol')} ayuda={DESCRIPCION_ROL[datos.rol]}>
          <select value={datos.rol} onChange={set('rol')}>
            <option value="">Elige un rol</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta={nuevo ? 'Contraseña inicial' : 'Nueva contraseña'}
          error={err('clave')}
          ayuda={nuevo ? 'Mínimo 8 caracteres. Se guarda cifrada con bcrypt en el sistema real.' : 'Déjala en blanco para mantener la actual.'}
        >
          <input type="password" value={datos.clave} onChange={set('clave')} autoComplete="new-password" />
        </Campo>
        {!nuevo && (
          <Casilla
            etiqueta="Cuenta activa"
            descripcion="Si se desactiva, no puede iniciar sesión."
            checked={datos.activo}
            onChange={set('activo')}
          />
        )}
        {error && !error.campo && <p className={f.errorGeneral}>{error.message}</p>}
      </form>
    </Dialogo>
  );
}

/** Usuarios del personal y sus roles (RF10). */
export default function UsuariosAdminPage() {
  const { usuario: actual } = useOutletContext();
  const [usuarios, recargar] = useEnVivo(getUsuariosAdmin);
  const [editando, setEditando] = useState(null);
  const [aviso, avisar] = useAviso();
  const cerrar = useCallback(() => setEditando(null), []);

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Usuarios</h1>
          <p className={a.bajada}>
            Solo el personal tiene cuenta. Los comensales no se registran ni entregan datos personales.
          </p>
        </div>
        <button
          type="button"
          className={styles.botonPrimario}
          onClick={() => setEditando({ nombre: '', correo: '', rol: ROLES.GARZON, activo: true })}
        >
          + Nuevo usuario
        </button>
      </header>
      <section className={a.card}>
        <div className={a.tablaScroll}>
          <table className={a.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className={a.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios?.map((u) => (
                <tr key={u.id} className={!u.activo ? styles.retirado : undefined}>
                  <td>
                    <span className={styles.usuario}>
                      <span className={styles.avatar}>{u.nombre[0]}</span>
                      <strong>{u.nombre}</strong>
                      {u.id === actual.id && <span className={`${a.chip} ${a.chipGris}`}>Tú</span>}
                    </span>
                  </td>
                  <td>{u.correo}</td>
                  <td>
                    <span className={a.chip}>{NOMBRE_ROL[u.rol]}</span>
                  </td>
                  <td>
                    <span className={`${a.chip} ${u.activo ? a.chipOk : a.chipGris}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <button type="button" className={styles.botonTexto} onClick={() => setEditando(u)}>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editando && (
        <UsuarioForm
          inicial={editando}
          idActual={actual.id}
          onClose={cerrar}
          onGuardado={(t) => {
            setEditando(null);
            avisar(t);
            recargar();
          }}
        />
      )}
      <Aviso aviso={aviso} />
    </>
  );
}
