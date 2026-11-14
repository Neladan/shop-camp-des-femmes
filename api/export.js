import { query } from '../lib/db.js';
import { isAdmin, unauthorized, orderNumber, PACKS } from '../lib/http.js';

const LABELS = { nouvelle: 'Nouvelle', confirmee: 'Confirmée', payee: 'Payée', livree: 'Livrée', annulee: 'Annulée' };

function cell(v) {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export : toutes les commandes en CSV (ouvrable dans Excel)
export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await query(`SELECT * FROM pack_orders ORDER BY id`);
  // Une ligne par article (t-shirt seul ou pack) : pratique pour préparer les colis.
  const head = ['N°', 'Date', 'Nom et prénoms', 'Téléphone', 'Article', 'Contenu', 'Taille', 'Couleur', 'Quantité', 'Montant commande (F CFA)', 'Statut', 'Note'];
  const lines = rows.flatMap((r) => {
    const date = new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' });
    const items = [
      ...(r.tshirts || []).map((a) => ['T-shirt seul', '', a.taille, a.couleur, a.quantite]),
      ...(r.packs || []).map((p) => [`Pack ${p.pack}`, PACKS[p.pack]?.contenu.join(', ') || '', p.taille, p.couleur, p.quantite]),
    ];
    return (items.length ? items : [['', '', '', '', 0]]).map((it) => [
      orderNumber(r.id), date, r.nom, r.telephone, ...it, r.montant, LABELS[r.statut] || r.statut, r.note,
    ].map(cell).join(';'));
  });
  const csv = '﻿' + [head.join(';'), ...lines].join('\r\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="commandes-packs-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
