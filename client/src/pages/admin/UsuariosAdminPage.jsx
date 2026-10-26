import { useEffect, useState } from 'react';
import { getUsuarios, NOMBRE_ROL } from '../../services/staffApi';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';

/** Usuarios del personal y sus roles (RF10). */
export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState(null);
  useEffect(() => {
    getUsuarios().then(setUsuarios);
  }, []);

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Usuarios</h1>
          <p className={a.bajada}>
            Solo el personal tiene cuenta. Los comensales no se registran ni entregan datos personales.
          </p>
        </div>
        <button type="button" className={styles.botonSecundario} disabled title="Disponible en el sprint 3">
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
              </tr>
            </thead>
            <tbody>
              {usuarios?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className={styles.usuario}>
                      <span className={styles.avatar}>{u.nombre[0]}</span>
                      <strong>{u.nombre}</strong>
                    </span>
                  </td>
                  <td>{u.correo}</td>
                  <td>
                    <span className={a.chip}>{NOMBRE_ROL[u.rol]}</span>
                  </td>
                  <td>
                    <span className={`${a.chip} ${u.activo ? a.chipOk : a.chipGris}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
