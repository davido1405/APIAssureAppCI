# Plan de sécurisation — Contrôle d'accès API Node (GoPharma)

> **Statut** : plan uniquement, **aucune implémentation applicative** à ce stade.
> Branche : `plan-securite-controle-acces` (créée depuis `fix/prerequis-pwa`).
> Cible : validation par David avant toute implémentation.
> Règle : ne rien casser dans l'app mobile Flutter existante en production.

---

## 1. Objectifs

1. Ajouter un middleware de vérification JWT sur toutes les routes d'écriture et de lecture de profil listées comme critiques dans le rapport de sécurité (`RAPPORT_SECURITE.md` §1).
2. Comparer l'identité portée par le jeton (`code_pharmacie`, `code_gerant`, `code_utilisateur`) à l'identité visée par la requête avant d'agir.
3. Ajouter un rôle `admin` réservé aux routes `/api/assurance/*` (catalogue d'assurances).
4. Hacher les codes PIN avec bcrypt, avec une stratégie de migration pour les comptes existants (PIN en clair aujourd'hui).
5. Lister, route par route, ce que l'application Flutter envoie aujourd'hui (en-tête `Authorization` ou non) afin d'évaluer le risque de casse en production si le contrôle d'accès est activé.

---

## 2. Routes critiques et contrôle d'accès proposé

Le tableau ci-dessous reprend les routes du rapport de sécurité (§1) testées en direct. Toutes retournent actuellement HTTP 200 sans jeton (faille de contrôle d'accès).

| Route | Méthode | Action | JWT requis ? | Identité à comparer | Rôle requis |
|---|---|---|---|---|---|
| `/api/pharmacie/modifierpharmacie` | PUT | Modifier une pharmacie | Oui | `code_pharmacie` du body ↔ pharmacie du gérant porteur du jeton | gérant propriétaire |
| `/api/pharmacie/modifierstatutgarde` | PUT | Basculer statut garde | Oui | `code_pharmacie` du body ↔ pharmacie du gérant porteur du jeton | gérant propriétaire |
| `/api/pharmacie/ajouterassurance` | POST | Ajouter assurance à une pharmacie | Oui | `codePharmacie` du body ↔ pharmacie du gérant porteur du jeton | gérant propriétaire |
| `/api/pharmacie/profilpharmacie` | POST | Lire profil pharmacie | Oui | `code_gerant` du body ↔ gérant porteur du jeton | gérant propriétaire |
| `/api/utilisateur/profilutilisateur` | POST | Lire profil utilisateur | Oui | `code_utilisateur` du body ↔ utilisateur porteur du jeton | utilisateur concerné |
| `/api/utilisateur/envoyerFCMT` | PUT | Mettre à jour token FCM | Oui | `code_utilisateur` du body ↔ utilisateur porteur du jeton | utilisateur concerné |
| `/api/utilisateur/enovyerLocalisation` | PUT | Mettre à jour position | Oui | `code_utilisateur` du body ↔ utilisateur porteur du jeton | utilisateur concerné |
| `/api/annonces/envoyer` | POST | Publier une annonce | Oui | `code_gerant` du body ↔ gérant porteur du jeton | gérant propriétaire |
| `/api/annonces/:id_annonce` | DELETE | Supprimer une annonce | Oui | `code_gerant` du body ↔ gérant propriétaire de l'annonce | gérant propriétaire |
| `/api/newsLetters/sabonner` | POST | S'abonner à une pharmacie | Oui | `codePharmacie` du body ↔ pharmacie cible ; `codeUtilisateur` ↔ utilisateur porteur | utilisateur concerné |
| `/api/newsLetters/abonnement` | POST | Lire ses abonnements | Oui | `codeUtilisateur` du body ↔ utilisateur porteur du jeton | utilisateur concerné |
| `/api/newsLetters/supprimerabonnement` | DELETE | Se désabonner | Oui | `codePharmacie`, `codeUtilisateur` du body ↔ utilisateur porteur | utilisateur concerné |
| `/api/abonnements/souscrire` | POST | Souscrire un forfait | Oui | `code_gerant` du body ↔ gérant porteur du jeton | gérant propriétaire |
| `/api/abonnements/actif` | GET | Lire forfait actif | Oui | `code_pharmacie` query ↔ pharmacie du gérant porteur | gérant propriétaire |
| `/api/abonnements/historique/:code` | GET | Historique forfaits | Oui | `code_pharmacie` path ↔ pharmacie du gérant porteur | gérant propriétaire |
| `/api/pharmacie/statistiques/avancees/:code` | GET | Stats avancées (Premium) | Oui | `code_pharmacie` path ↔ pharmacie du gérant porteur | gérant propriétaire + forfait premium |
| `/api/assurance/ajouterassurance` | POST | Ajouter une assurance au catalogue | Oui | N/A (catalogue global) | **admin** |
| `/api/assurance/modifierassurance` | PUT | Modifier une assurance | Oui | N/A (catalogue global) | **admin** |
| `/api/assurance/activerassurance` | PUT | Activer une assurance | Oui | N/A (catalogue global) | **admin** |
| `/api/assurance/desactiverassurance` | PUT | Désactiver une assurance | Oui | N/A (catalogue global) | **admin** |

### Règles du middleware (à spécifier)

1. **Extraction du jeton** : depuis l'en-tête `Authorization: Bearer <jeton>`. Si absent ou invalide → HTTP 401.
2. **Vérification de la signature et expiration** : rejeter si `alg: none`, confusion HS/RS, expiration (`exp`) dépassée, signature falsifiée.
3. **Récupération de l'identité** : décoder le payload JWT pour obtenir `code_utilisateur`, `code_pharmacie`, `type_utilisateur` (ou `role`).
4. **Comparaison d'identité** : pour les routes avec `code_pharmacie`/`code_gerant`/`code_utilisateur` dans le body, vérifier que l'identité du jeton correspond à l'entité visée. Sinon → HTTP 403.
5. **Vérification de rôle** : pour `/api/assurance/*`, vérifier `role === 'admin'` (ou `type_utilisateur === 'admin'`). Sinon → HTTP 403.
6. **Vérification de forfait** : pour `statistiques/avancees`, vérifier que la pharmacie porteuse a un forfait premium actif (via `verifierAccesFonctionnalite` existant).

---

## 3. Rôle admin pour `/api/assurance/*`

- Ajouter une valeur `admin` dans la table `type_utilisateur` (ou un champ `role` dans `utilisateurs`).
- Seuls les utilisateurs avec ce rôle peuvent appeler `POST /api/assurance/ajouterassurance`, `PUT /api/assurance/modifierassurance`, `PUT /api/assurance/activerassurance`, `PUT /api/assurance/desactiverassurance`.
- Les routes de lecture (`GET /api/assurance`) restent publiques (catalogue d'assurances accessible aux patients).

---

## 4. Hachage bcrypt des PIN + stratégie de migration

### État actuel
- `models/utilisateur.js:224` compare le PIN en clair : `utilisateur.password_hash != codePinUtilisateur`.
- Le package `bcrypt` (`^6.0.0`) est présent dans `package.json` mais **non utilisé**.
- Les PIN existants sont stockés en clair dans la colonne `password_hash`.

### Plan de migration

1. **Inscription** : hacher le PIN avec `bcrypt.hashSync(pin, 10)` avant de l'enregistrer dans `password_hash`.
2. **Connexion** : 
   - Tenter d'abord `bcrypt.compareSync(pin_saisi, password_hash_stocké)`.
   - Si `false` ET que le stocké ressemble à un PIN en clair (4-6 chiffres, pas de préfixe `$2b$`), tenter la comparaison en clair pour rétrocompatibilité.
   - Si la comparaison en clair réussit : **migrer** — remplacer `password_hash` par `bcrypt.hashSync(pin_saisi, 10)` en base, puis authentifier.
   - Si les deux échouent : rejeter (PIN erroné).
3. **Mise à jour de profil / changement de PIN** : toujours stocker le hash bcrypt.
4. **Récupération de PIN** : rester en 501 (pas de flux OTP inventé), ne pas confirmer l'existence d'un numéro.

### Pourquoi cette migration ?
Évite de forcer tous les utilisateurs existants à réinitialiser leur PIN. La migration se fait de manière transparente au prochain login réussi de chaque utilisateur.

---

## 4. Ce que l'app Flutter envoie aujourd'hui (à documenter — code Flutter non disponible dans ce dépôt)

**⚠️ Le code source de l'application mobile Flutter n'est pas présent dans ce dépôt (`D:\AssurAppCI-Web` et `D:\Bureau\AssurAppCI\APIassureAppCI` ne contiennent que le backend Node et le front web PHP).** Cette section doit être complétée par David ou par la personne qui maintient l'app Flutter, **avant** d'activer le middleware JWT en production.

Ce qui est déjà connu (côté backend) :
- Les contrôleurs lisent l'identité directement depuis `req.body` (`code_gerant`, `codePharmacie`, `code_utilisateur`, etc.) — aucun `req.headers.authorization` n'est lu aujourd'hui.
- Le JWT est généré à l'inscription et à la connexion (`jwt.generateurJWT`) et renvoyé dans `data.jwt_tokens`, mais **jamais vérifié** côté serveur.

### Tableau à remplir (route par route)

| Route | App Flutter envoie-t-elle `Authorization: Bearer <jwt>` ? | App Flutter envoie-t-elle l'identité dans le body ? | Risque si JWT activé |
|---|---|---|---|
| `PUT /api/pharmacie/modifierpharmacie` | À documenter | Oui (`code_pharmacie`) | Casse si pas de jeton |
| `PUT /api/pharmacie/modifierstatutgarde` | À documenter | Oui (`code_pharmacie`) | Casse si pas de jeton |
| `POST /api/pharmacie/ajouterassurance` | À documenter | Oui (`codePharmacie`) | Casse si pas de jeton |
| `POST /api/pharmacie/profilpharmacie` | À documenter | Oui (`code_gerant`) | Casse si pas de jeton |
| `POST /api/utilisateur/profilutilisateur` | À documenter | Oui (`code_utilisateur`) | Casse si pas de jeton |
| `PUT /api/utilisateur/envoyerFCMT` | À documenter | Oui (`code_utilisateur`) | Casse si pas de jeton |
| `PUT /api/utilisateur/enovyerLocalisation` | À documenter | Oui (`code_utilisateur`) | Casse si pas de jeton |
| `POST /api/annonces/envoyer` | À documenter | Oui (`code_gerant`) | Casse si pas de jeton |
| `DELETE /api/annonces/:id` | À documenter | Oui (`code_gerant`) | Casse si pas de jeton |
| `POST /api/newsLetters/sabonner` | À documenter | Oui (`codePharmacie`, `codeUtilisateur`) | Casse si pas de jeton |
| `POST /api/newsLetters/abonnement` | À documenter | Oui (`codeUtilisateur`) | Casse si pas de jeton |
| `DELETE /api/newsLetters/supprimerabonnement` | À documenter | Oui (`codePharmacie`, `codeUtilisateur`) | Casse si pas de jeton |
| `POST /api/abonnements/souscrire` | À documenter | Oui (`code_gerant`) | Casse si pas de jeton |
| `GET /api/abonnements/actif` | À documenter | Oui (`code_pharmacie` en query) | Casse si pas de jeton |
| `GET /api/abonnements/historique/:code` | À documenter | Oui (`code_pharmacie` en path) | Casse si pas de jeton |
| `GET /api/pharmacie/statistiques/avancees/:code` | À documenter | Oui (`code_pharmacie` en path) | Casse si pas de jeton |
| `POST /api/assurance/ajouterassurance` | À documenter | Oui (`codePharmacie`) | Casse si pas de jeton + rôle admin |
| `PUT /api/assurance/modifierassurance` | À documenter | Oui (`id_assurance`) | Casse si pas de jeton + rôle admin |
| `PUT /api/assurance/activerassurance` | À documenter | Oui (`id_assurance`) | Casse si pas de jeton + rôle admin |
| `PUT /api/assurance/desactiverassurance` | À documenter | Oui (`id_assurance`) | Casse si pas de jeton + rôle admin |

**Action requise** : David doit confirmer pour chaque route si l'app Flutter envoie déjà l'en-tête `Authorization`. Si une route critique n'envoie pas le jeton, l'activer casse l'app mobile en production. Dans ce cas, prévoir une période de compatibilité (accepter l'identité du body **ou** du token) avant de rendre le JWT obligatoire.

---

## 5. Ordre d'implémentation conseillé

1. **Documenter** ce que l'app Flutter envoie (section 4) — bloquant avant toute activation.
2. **Ajouter le rôle admin** dans `type_utilisateur` et créer le premier compte admin.
3. **Implémenter le hachage bcrypt** + migration (inscription + connexion) — transparent pour les utilisateurs existants.
4. **Implémenter le middleware JWT** en mode "compatibilité" (accepter body OU token) sur les routes d'écriture d'abord.
5. **Vérifier** que l'app mobile fonctionne encore en mode compatibilité.
6. **Passer en mode strict** (jeton obligatoire) une fois l'app Flutter mise à jour pour envoyer le jeton.
7. **Désactiver** l'acceptation de l'identité du body seul.

---

## 6. Livrables

- Ce document (`PLAN_SECURITE_CONTROLE_ACCES.md`).
- Aucun code applicatif modifié à ce stade (conformément à la règle "ne rien corriger sans validation").
- Le rapport de tests existe dans `D:\AssurAppCI-Web\tests\security\` et `D:\AssurAppCI-Web\RAPPORT_SECURITE.md`.
