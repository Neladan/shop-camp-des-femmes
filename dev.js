// Serveur local pour tester sans Vercel : `bun run dev.js` puis http://localhost:3000
// Sans DATABASE_URL, les données sont en mémoire et le mot de passe admin est « admin ».
import * as orders from './api/orders.js';
import * as orderById from './api/orders/[id].js';
import * as session from './api/session.js';
import * as exportCsv from './api/export.js';

const routes = [
  [/^\/api\/orders\/\d+$/, orderById],
  [/^\/api\/orders$/, orders],
  [/^\/api\/session$/, session],
  [/^\/api\/export$/, exportCsv],
];

Bun.serve({
  port: Number(process.env.PORT || 3000),
  async fetch(req) {
    const { pathname } = new URL(req.url);
    for (const [re, mod] of routes) {
      if (re.test(pathname)) {
        const fn = mod[req.method];
        return fn ? fn(req) : new Response('Method not allowed', { status: 405 });
      }
    }
    let path = pathname === '/' ? '/index.html' : pathname;
    if (!path.includes('.')) path += '.html';
    const file = Bun.file('./public' + path);
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
  },
});
console.log('http://localhost:' + (process.env.PORT || 3000));
