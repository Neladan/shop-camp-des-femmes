import { createHmac, timingSafeEqual } from 'node:crypto';

export const TAILLES = ['S', 'M', 'L', 'XL', 'XXL'];
export const STATUTS = ['nouvelle', 'confirmee', 'payee', 'livree', 'annulee'];
export const COULEURS = ['Bleu ciel', 'Bleu roi', 'Bleu nuit', 'Blanc', 'Noir'];
export const MOMO = '01 61 92 68 25'; // MTN MoMo
export const MOMO_NOM = 'Oloufemi Glorieuse OKE';

// T-shirts seuls : prix selon le nombre total (4 au maximum par commande)
export const PRIX_TSHIRTS = [0, 6000, 10000, 15000, 20000];
export const TSHIRTS_MAX = PRIX_TSHIRTS.length - 1;

// Packs : chacun contient un t-shirt (taille + couleur à choisir)
export const PACKS = {
  1: { prix: 23000, contenu: ['Tote bag', 'Thermos', 'Carnet', 'Stylo', 'Éventail', 'T-shirt'] },
  2: { prix: 20000, contenu: ['Thermos', 'Carnet', 'Stylo', 'Éventail', 'T-shirt'] },
  3: { prix: 15500, contenu: ['Tote bag', 'Carnet', 'Stylo', 'Éventail', 'T-shirt'] },
  4: { prix: 12000, contenu: ['Carnet', 'Stylo', 'Éventail', 'T-shirt'] },
  5: { prix: 10000, contenu: ['Stylo', 'Éventail', 'T-shirt'] },
};
export const PACK_QTE_MAX = 10; // par ligne de pack
export const LIGNES_MAX = 10;   // lignes de packs par commande

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function clean(v, max = 120) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readShirt(a) {
  const taille = clean(a?.taille, 4).toUpperCase();
  const couleur = COULEURS.find((c) => c.toLowerCase() === clean(a?.couleur, 30).toLowerCase());
  return { taille: TAILLES.includes(taille) ? taille : '', couleur: couleur || '' };
}

// Valide les t-shirts seuls [{ taille, couleur, quantite }] et les packs [{ pack, taille, couleur, quantite }].
// Retourne { tshirts, packs } ou { error, list, index, field }. Les lignes identiques sont fusionnées.
export function validateItems(tshirtsIn, packsIn) {
  const tl = Array.isArray(tshirtsIn) ? tshirtsIn : [];
  const pl = Array.isArray(packsIn) ? packsIn : [];
  if (!tl.length && !pl.length) return { error: 'Ajoutez au moins un t-shirt ou un pack.' };
  if (tl.length > TSHIRTS_MAX) return { error: `${TSHIRTS_MAX} t-shirts seuls au maximum.`, list: 'tshirts' };
  if (pl.length > LIGNES_MAX) return { error: `${LIGNES_MAX} lignes de packs au maximum.`, list: 'packs' };

  const tshirts = new Map();
  for (const [i, a] of tl.entries()) {
    const { taille, couleur } = readShirt(a);
    const quantite = Number.parseInt(a?.quantite, 10);
    const n = tl.length > 1 ? ` (t-shirt ${i + 1})` : '';
    if (!taille) return { error: `Choisissez une taille${n}.`, list: 'tshirts', index: i, field: 'taille' };
    if (!couleur) return { error: `Choisissez une couleur${n}.`, list: 'tshirts', index: i, field: 'couleur' };
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > TSHIRTS_MAX)
      return { error: `Quantité invalide${n}.`, list: 'tshirts', index: i, field: 'quantite' };
    const key = taille + '|' + couleur;
    const prev = tshirts.get(key);
    if (prev) prev.quantite += quantite; else tshirts.set(key, { taille, couleur, quantite });
  }
  if (nbTshirtsSeuls([...tshirts.values()]) > TSHIRTS_MAX)
    return { error: `${TSHIRTS_MAX} t-shirts seuls au maximum par commande.`, list: 'tshirts' };

  const packs = new Map();
  for (const [i, a] of pl.entries()) {
    const pack = Number.parseInt(a?.pack, 10);
    const { taille, couleur } = readShirt(a);
    const quantite = Number.parseInt(a?.quantite, 10);
    const n = pl.length > 1 ? ` (pack ${i + 1})` : '';
    if (!PACKS[pack]) return { error: `Choisissez un pack${n}.`, list: 'packs', index: i, field: 'pack' };
    if (!taille) return { error: `Choisissez la taille du t-shirt${n}.`, list: 'packs', index: i, field: 'taille' };
    if (!couleur) return { error: `Choisissez la couleur du t-shirt${n}.`, list: 'packs', index: i, field: 'couleur' };
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > PACK_QTE_MAX)
      return { error: `La quantité doit être comprise entre 1 et ${PACK_QTE_MAX}${n}.`, list: 'packs', index: i, field: 'quantite' };
    const key = pack + '|' + taille + '|' + couleur;
    const prev = packs.get(key);
    if (prev) prev.quantite = Math.min(PACK_QTE_MAX * LIGNES_MAX, prev.quantite + quantite);
    else packs.set(key, { pack, taille, couleur, quantite });
  }
  return { tshirts: [...tshirts.values()], packs: [...packs.values()].sort((a, b) => a.pack - b.pack) };
}

export const nbTshirtsSeuls = (tshirts) => tshirts.reduce((s, a) => s + a.quantite, 0);
export const nbPacks = (packs) => packs.reduce((s, p) => s + p.quantite, 0);

export function montant(tshirts, packs) {
  return PRIX_TSHIRTS[nbTshirtsSeuls(tshirts)] + packs.reduce((s, p) => s + PACKS[p.pack].prix * p.quantite, 0);
}

// Valide et normalise une commande. Retourne { order } ou { errors }.
export function validateOrder(body) {
  const errors = {};
  const order = {
    nom: clean(body?.nom, 160),
    telephone: clean(body?.telephone, 30),
  };
  if (!order.nom) errors.nom = 'Indiquez votre nom et vos prénoms.';
  if (!order.telephone) errors.telephone = 'Indiquez votre numéro de téléphone.';
  else if (!/^[+0-9 ().-]{8,30}$/.test(order.telephone)) errors.telephone = 'Numéro invalide.';
  const it = validateItems(body?.tshirts, body?.packs);
  if (it.error) errors.items = { message: it.error, list: it.list, index: it.index, field: it.field };
  else Object.assign(order, it, { montant: montant(it.tshirts, it.packs) });
  return Object.keys(errors).length ? { errors } : { order };
}

export function orderNumber(id) {
  return 'PK-' + String(id).padStart(4, '0');
}

// ---- Authentification du dashboard (mot de passe partagé + cookie signé) ----
const COOKIE = 'cf_packs_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret';
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function checkPassword(given) {
  const expected = process.env.ADMIN_PASSWORD || (process.env.DATABASE_URL ? '' : 'admin');
  if (!expected) return false;
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const token = `${exp}.${sign(exp)}`;
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(request) {
  const raw = request.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig) return false;
  const good = sign(exp);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now() / 1000;
}

export function unauthorized() {
  return json({ error: 'Non autorisé' }, 401);
}
