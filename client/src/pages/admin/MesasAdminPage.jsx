import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { crearMesa, getMesasAdmin, regenerarQr, setActivaMesa } from '../../services/catalogo';
import { useEnVivo } from '../../hooks/useEnVivo';
import Dialogo from './ui/Dialogo';
import Aviso from './ui/Aviso';
import { useAviso } from './ui/useAviso';
import a from './Admin.module.css';
import styles from './AdminPages.module.css';

/** Descarga el QR de la mesa como PNG listo para imprimir, con el número de la mesa. */
function descargarQr(mesa) {
  const svg = document.getElementById(`qr-mesa-${mesa.id}`);
  const datos = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const lado = 800;
    const canvas = document.createElement('canvas');
    canvas.width = lado;
    canvas.height = lado + 140;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 60, 60, lado - 120, lado - 120);
    ctx.fillStyle = '#1d1029';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Mesa ${mesa.numero}`, lado / 2, lado + 30);
    ctx.font = '32px sans-serif';
    ctx.fillText('Escanea para ver la carta y pedir', lado / 2, lado + 90);
    const enlace = document.createElement('a');
    enlace.download = `qr-mesa-${mesa.numero}.png`;
    enlace.href = canvas.toDataURL('image/png');
    enlace.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(datos)}`;
}

/** Mesas y sus códigos QR (RF10). Cada QR abre la carta con el token aleatorio de la mesa. */
export default function MesasAdminPage() {
  const [mesas, recargar] = useEnVivo(getMesasAdmin);
  const [aRegenerar, setARegenerar] = useState(null);
  const [aviso, avisar] = useAviso();
  const origen = window.location.origin;
  const cerrarDialogo = useCallback(() => setARegenerar(null), []);

  const intentar = async (accion) => {
    try {
      const texto = await accion();
      if (texto) avisar(texto);
    } catch (err) {
      avisar(err.message, true);
    }
    recargar();
  };
  const nueva = () => intentar(async () => `Mesa ${await crearMesa()} creada con su código QR`);
  const cambiarEstado = (m) =>
    intentar(async () => {
      await setActivaMesa(m.id, !m.activa, m.cuentaAbierta);
      return m.activa ? `Mesa ${m.numero} desactivada: su QR deja de abrir la carta` : `Mesa ${m.numero} activada`;
    });
  const confirmarRegenerar = () => {
    const mesa = aRegenerar;
    setARegenerar(null);
    intentar(async () => {
      await regenerarQr(mesa.id);
      return `Nuevo QR para la mesa ${mesa.numero}. Imprímelo y reemplaza el anterior.`;
    });
  };

  return (
    <>
      <header className={a.cabecera}>
        <div>
          <h1>Mesas y códigos QR</h1>
          <p className={a.bajada}>
            Cada código contiene un identificador aleatorio, para que no se pueda adivinar la dirección de otra mesa.
          </p>
        </div>
        <button type="button" className={styles.botonPrimario} onClick={nueva}>
          + Nueva mesa
        </button>
      </header>

      <ul className={styles.mesas}>
        {mesas?.map((m) => (
          <li key={m.id} className={`${a.card} ${styles.mesa} ${!m.activa ? styles.mesaInactiva : ''}`}>
            <div className={styles.qr}>
              <QRCodeSVG
                id={`qr-mesa-${m.id}`}
                value={`${origen}/mesa/${m.token_qr}`}
                size={148}
                fgColor="#1d1029"
                marginSize={0}
              />
            </div>
            <div className={styles.mesaInfo}>
              <h2>Mesa {m.numero}</h2>
              <span className={styles.chips}>
                {m.cuentaAbierta && <span className={a.chip}>Cuenta abierta</span>}
                <span className={`${a.chip} ${m.activa ? a.chipOk : a.chipGris}`}>{m.activa ? 'Activa' : 'Inactiva'}</span>
              </span>
            </div>
            <code className={styles.token}>/mesa/{m.token_qr}</code>
            <div className={styles.mesaAcciones}>
              <button type="button" className={styles.botonTexto} onClick={() => descargarQr(m)} disabled={!m.activa}>
                Descargar QR
              </button>
              <button type="button" className={styles.botonTexto} onClick={() => setARegenerar(m)}>
                Regenerar QR
              </button>
              <button
                type="button"
                className={`${styles.botonTexto} ${m.activa ? styles.botonPeligro : ''}`}
                onClick={() => cambiarEstado(m)}
              >
                {m.activa ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            {m.activa && (
              <Link to={`/mesa/${m.token_qr}`} target="_blank" className={styles.abrir}>
                Abrir carta de la mesa
              </Link>
            )}
          </li>
        ))}
      </ul>

      {aRegenerar && (
        <Dialogo
          titulo={`Regenerar el QR de la mesa ${aRegenerar.numero}`}
          onClose={cerrarDialogo}
          pie={
            <>
              <button type="button" className="btn-secondary" onClick={cerrarDialogo}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmarRegenerar}>
                Regenerar QR
              </button>
            </>
          }
        >
          <p>
            Se creará un código nuevo y <strong>el QR impreso actual dejará de funcionar</strong>. Úsalo si el código se
            dañó o si alguien lo copió.
          </p>
        </Dialogo>
      )}
      <Aviso aviso={aviso} />
    </>
  );
}
