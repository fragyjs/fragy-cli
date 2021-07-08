import Koa from 'koa';
import path from 'path';
import mime from 'mime';
import fs from 'fs';

const createServer = (dir: string) => {
  const server = new Koa();
  server.use(async (ctx) => {
    let filePath: string;
    if (/\.(js|json|css|ico|html)$/.test(ctx.path) || /\/data\/.+\.md$/.test(ctx.path)) {
      filePath = path.resolve(dir, `.${ctx.path}`);
      ctx.body = fs.createReadStream(filePath);
    } else {
      ctx.set('Content-Type', 'text/html');
      filePath = path.resolve(dir, './index.html');
    }
    const ext = path.extname(filePath);
    if (ext) {
      const contentType = mime.getType(ext.substr(1));
      if (contentType) {
        ctx.set('Content-Type', contentType);
      } else {
        ctx.set('Content-Type', 'text/plain');
      }
    } else {
      ctx.set('Content-Type', 'text/plain');
    }
    // set cors
    ctx.set('Access-Control-Allow-Origin', '*');
    // set body
    ctx.body = fs.createReadStream(filePath);
  });
  return server;
};

export default createServer;
