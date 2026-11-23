import './env.js';
import { createServer } from 'node:http';
import app, { ORIGENES } from './app.js';
import { iniciarSockets } from './sockets/index.js';

const PORT = process.env.PORT || 4000;

const server = createServer(app);
iniciarSockets(server, ORIGENES);

server.listen(PORT, () => {
  console.log(`API de Comanda BI escuchando en http://localhost:${PORT}`);
});
