# Audit de sécurité — APIAssurAppCI (lecture seule)

> Généré dans le cadre du groupe E2. Aucune correction appliquée ici.

## Synthèse

- **Middleware JWT** : `JwtManager.verificateurJWT` est défini dans `config/jwt_manager.js`, mais **jamais référencé** (aucun `app.use` ni montage par route). Aucune route n'exige de jeton JWT aujourd'hui.
- **Identité** : elle est lue directement dans le body/query/params (voir tableau). Aucune vérification contre un token.
- **Mot de passe (code PIN)** : stocké dans la colonne `password_hash` mais comparé **en clair** (`utilisateur.password_hash != codePinUtilisateur` dans `models/utilisateur.js`). Pas de hachage bcrypt utilisé lors de la connexion. Le package `bcrypt` est présent dans les dépendances mais non utilisé dans ce dépôt.
- **Limitation des tentatives** : aucune (`express-rate-limit` est appliqué globalement : 100 requêtes / 15 min), pas de protection spécifique sur `/connexion`.
- **Helmet** : `app.use(helmet())` est présent dans `index.js`.
- **CORS** : voir E1 (configurable via `CORS_ALLOWED_ORIGINS`).

## Tableau des routes prioritaires

| Route | JWT requis ? | Identité vérifiée contre le token ? |
|---|---|---|
| `PUT /api/pharmacie/modifierpharmacie` | Non | Non — `code_pharmacie` lu dans `req.body` |
| `PUT /api/pharmacie/modifierstatutgarde` | Non | Non — `code_pharmacie` lu dans `req.body` |
| `POST /api/pharmacie/ajouterassurance` | Non | Non — `codePharmacie` lu dans `req.body` |
| `POST /api/pharmacie/profilpharmacie` | Non | Non — `code_gerant` lu dans `req.body` |
| `POST /api/utilisateur/profilutilisateur` | Non | Non — `code_utilisateur` lu dans `req.body` |
| `POST /api/annonces/envoyer` | Non | Non — `code_gerant` lu dans `req.body` |
| `DELETE /api/annonces/{id}` | Non | Non — `code_gerant` lu dans `req.body` (id en params) |
| Newsletters (`/api/newsletters/*`) | Non | Non — identité lue depuis le body si présente |
| `POST /api/abonnements/souscrire` | Non | Non — `code_gerant` lu dans `req.body` |

## Constats à signaler sans modifier (E3)

- `GET /api/pharmacie/statistiques/avancees/:code_pharmacie` appelle `controllerPharmacie.statistiquesAvancees`, méthode **absente** du contrôleur.
- `recupererStatistiques` lit `req.params.code_pharmacie` alors que la route `/statistiques` n'a pas de paramètre de chemin, et exige un body non vide sur une requête `GET`.

## Plan proposé (à valider par David)

1. Appliquer `verificateurJWT` progressivement (d'abord sur les routes d'écriture des pharmacies) en laissant une période de compatibilité : accepter l'identité du body **ou** du token.
2. Remplacer la comparaison en clair du code PIN par un hachage bcrypt et migrer les valeurs existantes.
3. Ajouter un rate limit dédié et un compteur de tentatives échouées sur `/connexion`.
4. Lier l'identité au jeton JWT avant de modifier les contrôleurs (risque de casser l'app mobile actuelle).