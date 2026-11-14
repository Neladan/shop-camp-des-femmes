import { json, readJson, checkPassword, sessionCookie, clearCookie, isAdmin } from '../lib/http.js';

// GET /api/session : l'utilisatrice est-elle connectée ?
export async function GET(request) {
  return json({ admin: isAdmin(request) });
}

// POST /api/session : connexion au dashboard
export async function POST(request) {
  const body = await readJson(request);
  if (!checkPassword(body?.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: 'Mot de passe incorrect' }, 401);
  }
  return json({ admin: true }, 200, { 'set-cookie': sessionCookie() });
}

// DELETE /api/session : déconnexion
export async function DELETE() {
  return json({ admin: false }, 200, { 'set-cookie': clearCookie() });
}
