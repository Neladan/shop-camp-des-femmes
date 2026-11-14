import { query } from '../lib/db.js';
import { json, readJson, validateOrder, orderNumber, isAdmin, unauthorized, MOMO, MOMO_NOM } from '../lib/http.js';

// POST /api/orders : nouvelle commande (public)
export async function POST(request) {
  const body = await readJson(request);
  if (!body) return json({ error: 'Requête invalide' }, 400);
  if (body.website) return json({ ok: true, numero: 'PK-0000' }); // champ piège anti-robots
  const { order, errors } = validateOrder(body);
  if (errors) return json({ errors }, 422);
  const rows = await query(
    `INSERT INTO pack_orders (nom, telephone, tshirts, packs, montant)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5) RETURNING id`,
    [order.nom, order.telephone, JSON.stringify(order.tshirts), JSON.stringify(order.packs), order.montant]
  );
  return json({
    ok: true, numero: orderNumber(rows[0].id),
    tshirts: order.tshirts, packs: order.packs, montant: order.montant, momo: MOMO, momoNom: MOMO_NOM,
  }, 201);
}

// GET /api/orders : liste des commandes (dashboard)
export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await query(`SELECT * FROM pack_orders ORDER BY created_at DESC, id DESC`);
  return json({ orders: rows.map((r) => ({ ...r, numero: orderNumber(r.id) })) });
}
