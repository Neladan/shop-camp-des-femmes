import { query } from '../../lib/db.js';
import { json, readJson, clean, isAdmin, unauthorized, validateItems, montant, STATUTS } from '../../lib/http.js';

function idFrom(request) {
  const id = Number.parseInt(new URL(request.url).pathname.split('/').pop(), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/orders/:id : modifier statut, note ou détails (dashboard)
export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const id = idFrom(request);
  const body = await readJson(request);
  if (!id || !body) return json({ error: 'Requête invalide' }, 400);

  const sets = [];
  const params = [];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if ('statut' in body) {
    if (!STATUTS.includes(body.statut)) return json({ error: 'Statut inconnu' }, 422);
    add('statut', body.statut);
  }
  if ('note' in body) add('note', clean(body.note, 500));
  if ('nom' in body) {
    const v = clean(body.nom, 160);
    if (!v) return json({ error: 'Le nom est vide' }, 422);
    add('nom', v);
  }
  if ('telephone' in body) add('telephone', clean(body.telephone, 30));
  if ('tshirts' in body || 'packs' in body) {
    const it = validateItems(body.tshirts, body.packs);
    if (it.error) return json({ error: it.error }, 422);
    params.push(JSON.stringify(it.tshirts)); sets.push(`tshirts = $${params.length}::jsonb`);
    params.push(JSON.stringify(it.packs)); sets.push(`packs = $${params.length}::jsonb`);
    add('montant', montant(it.tshirts, it.packs));
  }
  if (!sets.length) return json({ error: 'Rien à modifier' }, 400);

  params.push(id);
  const rows = await query(
    `UPDATE pack_orders SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows.length) return json({ error: 'Commande introuvable' }, 404);
  return json({ order: rows[0] });
}

// DELETE /api/orders/:id (dashboard)
export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const id = idFrom(request);
  if (!id) return json({ error: 'Requête invalide' }, 400);
  await query(`DELETE FROM pack_orders WHERE id = $1`, [id]);
  return json({ ok: true });
}
