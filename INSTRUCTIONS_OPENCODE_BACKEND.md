# APIAssurAppCI — Correctifs backend préalables à la PWA

> Brief pour OpenCode. Dépôt concerné : le **backend** `APIAssurAppCI` (Node.js/Express). Ce brief est distinct du cahier des charges de la PWA (front).
> À placer à la racine du dépôt backend et à référencer dans `AGENTS.md`.

## 1. Règles impératives

- Travailler sur une **branche dédiée** (`fix/prerequis-pwa`), jamais sur `main`. Un commit par tâche, avec un message clair.
- **Aucun secret** : ne jamais lire, afficher ni committer `.env`, clés Firebase, identifiants MySQL/Railway, secret JWT, clés Cloudinary. Utiliser des variables factices.
- **Aucune connexion à la base de production, à Cloudinary ou à Firebase** pendant le travail et les tests : tout est mocké.
- **Ne pas casser les clients existants** (l'app Flutter déployée) : ne supprimer ni renommer aucune route, aucun champ de réponse, aucun code HTTP d'un cas de succès. On ajoute, on ne retire pas. Les exceptions éventuelles sont listées dans le rapport.
- **Ne pas modifier le schéma de la base** ni créer de migration. Si une tâche semble l'exiger, s'arrêter et le signaler.
- Ne pas toucher à la configuration de déploiement Railway, aux scripts npm de démarrage, ni à l'ordre des imports de `index.js` (`dotenv.config()` doit rester en première ligne).
- **Diffs minimaux** : pas de reformatage de fichiers entiers, pas de refactoring hors liste.
- **Lire avant d'écrire** : pour chaque tâche, ouvrir les fichiers concernés (contrôleur, modèle, routes) et confirmer le constat. Si le constat est faux (déjà corrigé, version différente), le noter dans le rapport et passer à la suite.
- S'arrêter à la fin de chaque groupe (A à F) avec un court résumé.

Ordre conseillé : A, B, C, D, puis F (tests au fil de l'eau), puis E.

## 2. Groupe A — Contrôleur pharmacie (`controllers/controller.pharmacie.js`)

### A1. `ajouterPharmacie` : ReferenceError systématique
- **Constat** : le `logger.info(...)` du début utilise `${nom_pharmacie}` avant la ligne `const { ..., nom_pharmacie, ... } = req.body`. Variable `const` utilisée avant sa déclaration : `ReferenceError`, donc un 500 à chaque appel.
- **Correction** : déplacer ce log après la déstructuration. Écrire `new Date().toISOString()` (avec les parenthèses ; actuellement c'est le texte de la fonction qui est loggé).
- **Vérification** : un appel avec un body valide et un modèle mocké ne produit plus de ReferenceError.

### A2. `ajouterPharmacie` : les trois horaires ne sont pas transmis
- **Constat** : la validation exige `horaires_en_semaine`, `horaires_samedi` et `horaires_dimanche`, mais l'appel au modèle passe `horraires_ouverture` (avec une faute), un champ qui n'est ni validé ni documenté.
- **Correction** : lire `models/pharmacie.js` (`ajouterPharmacie`, signature et SQL).
  - Si le modèle accepte (ou stocke déjà) les trois horaires séparément : les lui passer, comme le fait déjà `modifierPharmacie`.
  - Si le modèle ne stocke qu'un seul champ d'horaires : **ne pas inventer de format**. S'arrêter, décrire la structure de la table et proposer les options (concaténation, nouvelles colonnes), puis attendre la décision de David.
  - Conserver `horraires_ouverture` comme champ facultatif de compatibilité tant qu'on ne sait pas ce que le client mobile envoie.

### A3. `modifierPharmacie` : 500 après une modification réussie
- **Constat** : `const duree = new Date.now() - debut;` lève une `TypeError` (`Date.now` n'est pas un constructeur). Elle arrive **après** la mise à jour en base : la modification est enregistrée mais le client reçoit un 500.
- **Correction** :
  ```js
  const debut = Date.now();
  // ... appel au modèle ...
  const duree = Date.now() - debut;
  ```
- Dans les logs de cette méthode, remplacer `req.code_pharmacie` (toujours `undefined`) par `code_pharmacie`, et corriger `toISOString` sans parenthèses.
- Le log « Pas de nouvelle(s) assurance(s) acceptée(s) » est émis quand des assurances **sont** présentes : le déplacer dans le cas inverse ou le reformuler.

### A4. Requêtes laissées sans réponse
- **Constat** : dans `profilPharmacie`, `ajouterAssurance`, `rechercherPharmacie` et `toutePharmacies`, le `catch` logge l'erreur mais ne répond pas. La requête reste en attente jusqu'au timeout du client.
- **Correction** : ajouter dans chaque `catch`
  ```js
  return res.status(500).json({ success: false, message: "Erreur serveur" });
  ```
- Dans les `catch` de `ajouterPharmacie` et `modifierPharmacie`, ne plus renvoyer `error: error.message` au client en production : le conditionner à `process.env.NODE_ENV === "development"`, comme le fait déjà `mettreAJourStatutGarde`.

### A5. `toutePharmacies` : `limits` lu au mauvais endroit
- **Constat** : `const { limits } = req.params;` alors que la route `GET /` n'a aucun paramètre de chemin. La valeur est toujours `undefined`.
- **Correction** : lire `req.query.limits`, le convertir en entier positif, l'ignorer s'il est invalide. Sans `limits`, le comportement reste exactement celui d'aujourd'hui. Vérifier d'abord comment le modèle traite `undefined`.

### A6. Logs qui exposent des données personnelles
- **Constat** : `console.log("Body:", req.body)` et `console.log("File:", req.file)` dans `ajouterPharmacie`, `modifierPharmacie` et `mettreAJourStatutGarde` écrivent emails, téléphones et le **buffer de l'image** dans les logs.
- **Correction** : supprimer ces `console.log` ou les remplacer par un `logger.debug` sans champs personnels (par exemple seulement la liste des clés reçues et la taille du fichier).

## 3. Groupe B — Notifications (`routes/routes.notifications.js`)

### B1. Trois routes qui ne répondent jamais
- **Constat** : les handlers retournent la fonction du contrôleur sans l'appeler (`return controllerNotification.getToutesLesNotifications;`), et le `DELETE` n'a ni appel ni `return`.
- **Correction** (après avoir vérifié dans `controllers/controller.notifications.js` que ces méthodes existent avec ces noms exacts et comment elles lisent leurs entrées) :
  ```js
  routes.get("/", (req, res) => controllerNotification.getToutesLesNotifications(req, res));
  routes.put("/lireNotifications", (req, res) => controllerNotification.LireNotification(req, res));
  routes.delete("/supprimerNotification", (req, res) => controllerNotification.supprimerNotification(req, res));
  ```
- Si un nom diffère ou si une méthode est absente : le signaler et ne pas corriger cette route.

## 4. Groupe C — Utilisateur (`routes/routes.utilisateur.js`)

### C1. `POST /recoverPassword` : faux succès
- **Constat** : la route renvoie `success: true` sans rien vérifier. C'est un défaut de sécurité : elle prétend vérifier un numéro.
- **Correction** : répondre `501` avec `{ success: false, message: "Récupération du code PIN non disponible pour le moment" }`. **Ne pas inventer** de flux OTP ou SMS. Chercher dans le dépôt s'il existe un usage de cette route et le consigner dans le rapport (changement de comportement visible par le client).

### C2. `POST /ajouterAssurance` (utilisateur) : stub
- **Constat** : la route renvoie un succès avec le message copié de `recoverPassword`.
- **Correction** : chercher dans le contrôleur et le modèle utilisateur une fonction existante d'ajout d'assurances. Si elle existe, la brancher. Sinon, même réponse 501 que C1. Ne pas écrire de SQL nouveau.

### C3. Faute dans `/enovyerLocalisation`
- **Correction** : conserver la route actuelle (des clients mobiles l'utilisent peut-être), ajouter l'alias `/envoyerLocalisation` vers le même handler, et documenter le chemin correct en mentionnant l'ancien comme alias. Vérifier comment le contrôleur lit `code_utilisateur`, `latitude` et `longitude` (la doc les déclare en `path`, la route n'a aucun paramètre de chemin).

### C4. Import inutile
- Supprimer `const { route } = require("./routes.annonces");`.

## 5. Groupe D — Documentation Swagger

La documentation suit le code, jamais l'inverse : **aucun changement de comportement dans ce groupe**.

### D1. Les trois erreurs `Could not resolve pointer: /components/schemas/Array`
Elles viennent de `{Array[]}` dans le JSDoc :
1. `routes/routes.pharmacie.js` : typedef `informationAjoutAssurance`, propriété `liste_assurance` → `{array<string>}` (vérifier dans le modèle si ce sont des noms ou des identifiants ; contrôler la syntaxe des tableaux dans la doc de la version installée d'`express-jsdoc-swagger`).
2. `routes/routes.utilisateur.js` : le JSDoc intitulé `POST /api/utilisateur/recoverpassword` placé au-dessus de `/ajouterAssurance` est un copier-coller. Le renommer en `POST /api/utilisateur/ajouterAssurance`, corriger le résumé, et remplacer le paramètre `{Array[]}` par un typedef de body avec `{array<string>}`.
3. Le corps de `POST /api/pharmacie/ajouterassurance`, qui utilise le typedef du point 1.

**Vérification** : lancer l'app en local avec des variables factices, ouvrir `http://localhost:4000/docs` : plus aucun bandeau d'erreur, et aucun `$ref` non résolu dans le JSON de la spec.

### D2. Documentation alignée sur la réalité
- `GET /api/pharmacie` : seul `limits` en **query**.
- `GET /api/pharmacie/rechercher` : `terme_saisi`, `latitude`, `longitude` en **query** (pas en `path`) ; corriger la description de `terme_saisi` après lecture du modèle.
- `PUT /api/pharmacie/modifierpharmacie` : `code_pharmacie` obligatoire (et non `code_gerant`), en `multipart/form-data`.
- `PUT /api/pharmacie/modifierstatutgarde` : body JSON `{ code_pharmacie: string, est_de_garde: boolean }` ; corriger le résumé, qui est aujourd'hui « Mettre à jour les informations d'une pharmacie ».
- `POST /api/pharmacie/profilpharmacie` : body `{ code_gerant }`.
- `POST /api/pharmacie/ajouterPharmacie` : photo obligatoire, les trois horaires séparés.
- `GET /api/abonnements/historique` → `/api/abonnements/historique/{code_pharmacie}`.
- Routes notifications : chemins réels et emplacement réel des paramètres.
- `GET /api/annonces/pharmacie` : vérifier comment `code_pharmacie` est lu (probablement en query).

## 6. Groupe E — CORS et sécurité

### E1. CORS configurable
- Lire le fichier principal du serveur. Ajouter une liste d'origines autorisées via la variable `CORS_ALLOWED_ORIGINS` (séparées par des virgules). **Si la variable est absente, le comportement actuel est conservé.**
- Autoriser les en-têtes `Authorization` et `Content-Type`, et les méthodes `GET, POST, PUT, DELETE, OPTIONS`.
- Documenter la variable (valeur factice) dans `.env.example` et le README.

### E2. Audit de sécurité (lecture seule, aucune correction ici)
Produire `AUDIT_SECURITE.md` avec un tableau : route / JWT requis ? / identité vérifiée contre le token ? (ou simplement lue dans `code_gerant`, `code_pharmacie` ou `code_utilisateur` du body ?). Routes à couvrir en priorité : `modifierpharmacie`, `modifierstatutgarde`, `ajouterassurance` (pharmacie), `profilpharmacie`, `profilutilisateur`, `annonces/envoyer`, `annonces/{id}` (DELETE), newsletters, `abonnements/souscrire`.

Vérifier aussi : où et comment le middleware JWT est appliqué (global ou par route), comment `codePinUtilisateur` est stocké (haché ou non), l'existence d'une limitation du nombre de tentatives de connexion, et la présence de `helmet`.

**Ne rien corriger dans E2** : lier l'identité au JWT peut casser l'app mobile si elle n'envoie pas toujours l'en-tête `Authorization`. L'audit propose un plan, David valide, puis on implémente.

### E3. Constats à signaler sans modifier
- `GET /api/pharmacie/statistiques/avancees/:code_pharmacie` appelle `controllerPharmacie.statistiquesAvancees`, méthode absente du fichier de contrôleur fourni.
- `recupererStatistiques` lit `req.params.code_pharmacie` alors que la route `/statistiques` n'a pas de paramètre de chemin, et exige un body non vide sur une requête `GET`.

## 7. Groupe F — Tests

Si aucun framework de test n'existe, ajouter Jest et supertest en `devDependencies` (et le signaler). Mocker `models/pharmacie`, `services/UploadImages` et `logger`. Tests attendus :

1. `ajouterPharmacie` : body valide + fichier → 201 ; champ manquant → 400 ; JSON d'assurances invalide → 400 ; sans photo → 400 ; coordonnées invalides → 400 ; aucune ReferenceError.
2. `modifierPharmacie` : succès → 200 sans TypeError ; `code_pharmacie` manquant → 400 ; échec du modèle → 400.
3. `mettreAJourStatutGarde` : `est_de_garde: "true"` (chaîne) → 400 ; booléen → 200.
4. Modèle qui lève une erreur → réponse 500 JSON pour `profilPharmacie`, `ajouterAssurance`, `rechercherPharmacie` et `toutePharmacies` (plus aucune requête en attente).
5. `toutePharmacies` : `?limits=20` transmis comme `20` au modèle ; absent → `undefined` ; valeur invalide ignorée.
6. Les trois routes notifications répondent (contrôleur mocké).
7. `POST /recoverPassword` → 501.

Lancer aussi le lint et le formatage si une configuration existe, et vérifier que `npm start` démarre avec des variables factices (sinon expliquer pourquoi ce n'est pas vérifiable sans la vraie base).

## 8. Livrables

- La branche, avec un commit par tâche.
- `RAPPORT_CORRECTIONS.md` : pour chaque tâche, constat confirmé ou non, fichiers modifiés, comportement avant et après, tests ajoutés, et **ce qui n'a pas pu être vérifié** (notamment tout ce qui nécessite la vraie base).
- La liste des changements de comportement visibles par un client existant (par exemple `recoverPassword` en 501, champ `error` non exposé en production).
- `AUDIT_SECURITE.md`.

## 9. Hors périmètre

- Validation ou modération des pharmacies nouvellement enregistrées (décision produit de David).
- Liaison de l'identité au JWT sur les routes d'écriture (après validation de l'audit E2 uniquement).
- Suppression des routes, stubs ou champs existants, et toute modification du schéma de base.
- Le projet Flutter et le front PWA.
