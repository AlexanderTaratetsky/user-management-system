import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = await createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, { cors: { origin: env.corsOrigin } });

io.on('connection', () => {
  setInterval(() => io.emit('heartbeat', Date.now()), 30000);
});

server.listen(env.port, () => {
  console.log('API listening on ' + env.port);
});
