const express = require("express");
const controllerPharmacie = require("../controllers/controller.pharmacie");
const upload = require("../middleware/upload");
const routes = express.Router();
const { verifierAccesFonctionnalite } = require("../middleware/verifierAcces");
const { verifierJWT, verifierIdentite, verifierProprietairePharmacie } = require("../middleware/auth");
const { gestErrUpload } = require("../middleware/erreurs");
const logger = require("../logger");

// Route protégée - Statistiques avancées (Premium uniquement)
routes.get(
  "/statistiques/avancees/:code_pharmacie",
  // Propriété vérifiée AVANT le contrôle d'abonnement : sinon une requête
  // visant la pharmacie d'un autre gérant pourrait consommer son quota.
  verifierProprietairePharmacie(null, "code_pharmacie"),
  verifierAccesFonctionnalite("STATS_AVANCEES"),
  (req, res) => {
    return controllerPharmacie.statistiquesAvancees(req, res);
  },
);

//Récupérer le profil de la pharmacie
/**
 * POST /api/pharmacie/profilpharmacie
 * @summary Récupérer le profil de la pharmacie
 * @tags Pharmacie
 * @param {string} request.body.required -Code du gérant (code_gerant) dont on veut le profil
 * @return {object} 201 - Profil pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.post(
  "/profilpharmacie",
  verifierIdentite("code_gerant"),
  (req, res) => {
    return controllerPharmacie.profilPharmacie(req, res);
  },
);

//Ajouter une assurance à la liste des assurances acceptées
/**
 * @typedef {object} informationAjoutAssurance
 * @property {string} codePharmacie.required - Code de la pharmacie qui ajoute une assurance
 * @property {array<string>} liste_assurance.required - Nom de l'assurance à ajouter
 */
/**
 * POST /api/pharmacie/ajouterassurance
 * @summary Ajouter une assurance à la liste des assurances acceptées
 * @tags Pharmacie
 * @param {informationAjoutAssurance} request.body.required -Paramètre d'ajout d'une nouvelle assurance acceptée
 * @return {object} 201 - Assurance ajoutée avec succès
 * @return {object} 400 - Ajout de l'assurance impossible
 * @return {object} 500 - Erreur serveur
 */
routes.post(
  "/ajouterassurance",
  verifierProprietairePharmacie("codePharmacie"),
  (req, res) => {
    return controllerPharmacie.ajouterAssurance(req, res);
  },
);

//Enregistrer une pharmacie
/**
 * @typedef {object} infosAjouterPharmacie -Informations nécéssaire à ajouter une pharmacie
 * @property {string} code_pharmacie.required - Code de la pharmacie à modifier (obligatoire) - multipart/form-data
 * @property {string} nom_pharmacie.required - Nom de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} numero_pharmacie.required - Numéros de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} horaires_en_semaine.required - Les horaires d'ouverture de la pharmacie en semaine - application/x-www-form-urlencoded
 * @property {string} horaires_samedi.required - Les horaires d'ouverture de la pharmacie le samedi - application/x-www-form-urlencoded
 * @property {string} horaires_dimanche.required - Les horaires d'ouverture de la pharmacie le dimanche - application/x-www-form-urlencoded
 * @property {string} email_pharmacie.required - Email de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {number} latitudePharmacie.required - Latitude de la position de la pharmacie - application/x-www-form-urlencoded
 * @property {number} longitudePharmacie.required - Longitude de la position de la pharmacie - application/x-www-form-urlencoded
 * @property {string} ville_pharmacie.required - La ville où la pharmacie exerce - application/x-www-form-urlencoded
 * @property {string} adresse_fournit.required - Adresse fournie par la pharmacie - application/x-www-form-urlencoded
 * @property {string} liste_assurance_accepte.required - Liste des assurances acceptées (JSON array) - application/x-www-form-urlencoded - eg: ["NSIA", "AXA"]
 * @property {string} photo.required - Photo de la pharmacie (fichier image) - multipart/form-data - format: binary
 */
/**
 * POST /api/pharmacie/ajouterPharmacie
 * @summary Enregistrer une pharmacie dans l'app
 * @tags Pharmacie
 * @param {infosAjouterPharmacie} request.body.required -Information nécessaire pour enregistrer une pharmacie
 * @return {object} 201 - Pharmacie enregistrée avec succès
 * @return {object} 400 - Impossible d'enregistrer la pharmacie
 * @return {object} 500 - Erreur serveur
 */
routes.post(
  "/ajouterPharmacie",
  upload.single("photo"),
  upload.verifierContenuImage,
  (req, res) => {
    return controllerPharmacie.ajouterPharmacie(req, res);
  },
);

//Modifier les informations d'une pharmacie
/**
 * @typedef {object} infosMajPharmacie -Informations nécéssaire à ajouter une pharmacie
 * @property {string} code_pharmacie.required - Code de la pharmacie à modifier (obligatoire) - multipart/form-data
 * @property {string} nom_pharmacie - Nom de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} numero_pharmacie - Numéros de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} horaires_en_semaine - Les horaires d'ouverture de la pharmacie en semaine - application/x-www-form-urlencoded
 * @property {string} horaires_samedi - Les horaires d'ouverture de la pharmacie le samedi - application/x-www-form-urlencoded
 * @property {string} horaires_dimanche - Les horaires d'ouverture de la pharmacie le dimanche - application/x-www-form-urlencoded
 * @property {string} email_pharmacie - Email de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {number} latitudePharmacie - Latitude de la position de la pharmacie - application/x-www-form-urlencoded
 * @property {number} longitudePharmacie - Longitude de la position de la pharmacie - application/x-www-form-urlencoded
 * @property {string} ville_pharmacie - La ville où la pharmacie exerce - application/x-www-form-urlencoded
 * @property {string} adresse_fournit - Adresse fournie par la pharmacie - application/x-www-form-urlencoded
 * @property {string} liste_assurance_accepte - Liste des assurances acceptées (JSON array) - application/x-www-form-urlencoded - eg: ["NSIA", "AXA"]
 * @property {string} photo - Photo de la pharmacie (fichier image) - multipart/form-data - format: binary
 */
/**
 * PUT /api/pharmacie/modifierpharmacie
 * @summary Mettre à jour les informations d'une pharmacie
 * @tags Pharmacie
 * @param {infosMajPharmacie} request.body - Informations à mettre à jour en BD
 * @return {object} 201 - Pharmacie enregistrée avec succès
 * @return {object} 400 - Impossible d'enregistrer la pharmacie
 * @return {object} 500 - Erreur serveur
 */
routes.put(
  "/modifierpharmacie",
  upload.single("photo"), // ✅ Middleware AVANT le controller
  upload.verifierContenuImage, // ✅ Rejet 400 si le contenu n'est pas une image réelle
  verifierProprietairePharmacie("code_pharmacie"),
  controllerPharmacie.modifierPharmacie,
);

/**
 * @typedef {object} infosModifierStatutGarde
 * @property {string} code_pharmacie.required - Code de la pharmacie
 * @property {boolean} est_de_garde.required - Nouveau statut de garde
 */
/**
 * PUT /api/pharmacie/modifierstatutgarde
 * @summary Mettre à jour le statut de garde d'une pharmacie
 * @tags Pharmacie
 * @param {infosModifierStatutGarde} request.body.required - Corps JSON { code_pharmacie, est_de_garde }
 * @return {object} 200 - Statut de garde mis à jour avec succès
 * @return {object} 400 - Impossible de mettre à jour le statut
 * @return {object} 500 - Erreur serveur
 */
routes.put(
  "/modifierstatutgarde", // ✅ Middleware AVANT le controller
  verifierProprietairePharmacie("code_pharmacie"),
  controllerPharmacie.mettreAJourStatutGarde,
);

//Rechercher une pharmacie
/**
 * @typedef {object} infosRecherchePharmacie
 * @property {string} terme_saisi.query -Terme recherché (nom, assurance acceptée ou adresse)
 * @property {number} longitude.query -Longitude de la position de l'utilisateur
 * @property {number} latitude.query -Latitude de la position de l'utilisateur
 */
/**
 * GET /api/pharmacie/rechercher
 * @summary Rechercher  des pharmacies
 * @tags Pharmacie
 * @param {infosRecherchePharmacie} request.query -Les informations nécessaire à la recherche
 * @return {object} 201 - Pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.get("/rechercher", (req, res) => {
  return controllerPharmacie.rechercherPharmacie(req, res);
});

/**
 * GET /api/pharmacie/statistiques
 * @summary Récupérer toutes les statistiques de la pharmacie
 * @tags Pharmacie
 * @param {string} code_pharmacie.path.required - Le code de la pharmacie dont on veut récupérer les statistiques
 * @return {object} 200 - Statistiques récupérées avec succès
 * @return {object} 400 - Donnée introuvable pour cette pharmacie
 * @return {object} 500 - Erreur server
 */
routes.get("/statistiques", (req, res) => {
  return controllerPharmacie.recupererStatistiques(req, res);
});

//toute les pharmacies
/**
 * @typedef {object} infosToutePharmacie
 * @property {number} limits.query -Limiter le nombre de résultat pour plus d'éfficacité
 */
/**
 * GET /api/pharmacie
 * @summary Récupérer toutes les pharmacies
 * @tags Pharmacie
 * @param {infosToutePharmacie} request.query -Les informations nécessaire à la récupération des pharmacies
 * @return {object} 201 - Pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.get("/", (req, res) => {
  return controllerPharmacie.toutePharmacies(req, res);
});

// ============================================
// GESTION D'ERREUR DÉDIÉE AUX UPLOADS
// ============================================
// Intercepte les erreurs Multer (MulterError) et celles du fileFilter
// (ex. fichier non-image) et répond 400 JSON propre au lieu de 500 + pile.
// Montée APRÈS les routes : Express la traite bien comme error-handler.
routes.use(gestErrUpload);

module.exports = routes;
