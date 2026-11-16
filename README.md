# Packs et t-shirts · Camp des Femmes Afrique de l'Ouest 2026

Site de commande des packs et des t-shirts du camp, avec un dashboard de suivi pour l'équipe d'organisation.
Construit à partir du site de commande de t-shirts (`tshirt-commande-camp`), avec sa propre base de données.

- `/` : formulaire public. Nom et prénoms, téléphone, puis une liste d'articles :
  - **Packs** (chacun contient un t-shirt dont on choisit la taille et la couleur) :
    | Pack | Prix | Contenu |
    |---|---|---|
    | 1 | 23 000 F | Tote bag, thermos, carnet, stylo, éventail, t-shirt |
    | 2 | 20 000 F | Thermos, carnet, stylo, éventail, t-shirt |
    | 3 | 15 500 F | Tote bag, carnet, stylo, éventail, t-shirt |
    | 4 | 12 000 F | Carnet, stylo, éventail, t-shirt |
    | 5 | 10 000 F | Stylo, éventail, t-shirt |
  - **T-shirts seuls** : 1 = 6 000 F, 2 = 12 000 F, 3 = 15 000 F, 4 = 20 000 F (4 au maximum par commande). Chaque t-shirt a sa propre taille et sa propre couleur.
  - Tailles S → XXL, couleurs Bleu ciel, Bleu roi, Bleu nuit, Blanc, Noir.
  - Paiement MTN MoMo au 01 61 92 68 25 (Oloufemi Glorieuse OKE). Le montant est calculé par le serveur.
- `/admin` : dashboard protégé par mot de passe (montants attendus / encaissés, t-shirts à commander par taille × couleur, packs vendus, articles à préparer, liste, statuts, notes, modification, suppression, export Excel/CSV).

Les numéros de commande commencent par **PK-** (les commandes de t-shirts du premier site commencent par CF-).

Stack : pages HTML statiques + fonctions serverless Vercel (`/api`) + base Postgres (Neon). Aucune étape de build.

## Déployer sur Vercel

1. Sur vercel.com : *Add New → Project → Import* le dépôt GitHub `shop-camp-des-femmes`.
   Framework Preset : **Other**. Laisser Build Command et Output Directory vides. Cliquer **Deploy**.
2. **Base de données** : onglet **Storage → Create Database → Neon (Postgres)**, plan gratuit, et la connecter au projet.
   Vercel ajoute `DATABASE_URL`. La table `pack_orders` se crée toute seule à la première commande.
   *(On peut aussi réutiliser la base du site t-shirts : les deux sites utilisent des tables différentes.)*
3. **Variables d'environnement** (Settings → Environment Variables) :
   | Variable | Valeur |
   |---|---|
   | `ADMIN_PASSWORD` | le mot de passe de l'équipe pour `/admin` |
   | `SESSION_SECRET` | une longue chaîne aléatoire (ex. `openssl rand -hex 32`) |
4. **Redéployer** (Deployments → ⋯ → Redeploy) pour prendre en compte les variables.

Sans `ADMIN_PASSWORD` en production, le dashboard reste fermé.

## Tester en local

```bash
npm install
bun run dev.js        # http://localhost:3000  et  http://localhost:3000/admin
```

Sans `DATABASE_URL`, les commandes sont gardées en mémoire (perdues à l'arrêt) et le mot de passe du dashboard est `admin`.

## Utilisation du dashboard

- **Statuts** : Nouvelle → Confirmée → Payée → Livrée (ou Annulée). « Encaissé » additionne les commandes Payées et Livrées.
- **Crayon** : modifier les articles (le montant est recalculé), ajouter une note interne, ou supprimer la commande.
- **Exporter** : CSV avec une ligne par article (pack ou t-shirt seul), à ouvrir dans Excel ou Google Sheets.
- Les commandes annulées ne comptent dans aucun total. La page se met à jour toute seule toutes les 30 secondes.

## Modifier les prix, les packs ou le numéro MoMo

Les valeurs sont dans `lib/http.js` (`PACKS`, `PRIX_TSHIRTS`, `MOMO`, `MOMO_NOM`) et reprises dans `public/index.html` et `public/admin.html` (mêmes noms de constantes) : les changer aux trois endroits.

## Fichiers

```
public/index.html        formulaire
public/admin.html        dashboard
public/assets/           logos, photos des t-shirts
api/orders.js            POST (nouvelle commande) · GET (liste, admin)
api/orders/[id].js       PATCH (statut, note, modification) · DELETE
api/session.js           connexion / déconnexion du dashboard
api/export.js            export CSV
lib/db.js                connexion Postgres (Neon) ou base en mémoire en local
lib/http.js              catalogue, prix, validation, cookie de session signé
dev.js                   serveur local (Bun)
```
