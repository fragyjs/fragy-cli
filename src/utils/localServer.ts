import Koa from 'koa';
import path from 'path';
import mime from 'mime';
import http, { IncomingMessage } from 'http';
import fs from 'fs';
import fsp from 'fs/promises';
import ws from 'ws';
import { EventEmitter } from 'events';
import wsInjectionTemplate from '../template/wsInjection';

const startServer = (dir: string, port: number) => {
  const app = new Koa();
  const events = new EventEmitter();

  // init wss
  const server = http.createServer(app.callback());
  const wss = new ws.Server({
    server,
  });

  let connectedSock: ws | null;

  wss.on('connection', (websocket) => {
    connectedSock = websocket;
  });

  wss.on('close', () => {
    connectedSock = null;
  });

  events.on('refresh', () => {
    connectedSock?.send('refresh-page');
  });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit('connection', websocket, request);
      });
    }
  });

  // apply middleware
  app.use(async (ctx) => {
    let filePath: string;
    if (/\.(js|json|css|ico|html)$/.test(ctx.path) || /\/data\/.+\.md$/.test(ctx.path)) {
      const fileName = path.resolve(
        dir,
        ctx.path.startsWith('/') ? ctx.path.substring(1) : ctx.path,
      );
      filePath = path.resolve(dir, decodeURIComponent(fileName));
      ctx.set('Cache-Control', 'no-store');
      // eslint-disable-next-line require-atomic-updates
      ctx.body = fs.readFileSync(filePath, {
        encoding: 'utf-8',
      });
    } else {
      filePath = path.resolve(dir, './index.html');
      const fileContent = await fsp.readFile(filePath, { encoding: 'utf-8', flag: 'rs+' });
      const injectedContent = fileContent.replace(
        '</head>',
        `${wsInjectionTemplate.replace('<port>', port.toString())}\n</head>`.trim(),
      );
      // eslint-disable-next-line require-atomic-updates
      ctx.body = injectedContent;
    }
    const ext = path.extname(filePath)?.substring(1);
    if (ext && ext !== 'md') {
      const contentType = mime.getType(ext);
      ctx.set('Content-Type', contentType || 'text/plain');
    } else {
      ctx.set('Content-Type', 'text/plain');
    }
    // set cors
    ctx.set('Access-Control-Allow-Origin', '*');
  });

  // start server
  server.listen(port);

  return { server, events };
};

export default startServer;
