const express = require("express");
const controllerPharmacie = require("../controllers/controller.pharmacie");
const upload = require("../middleware/upload");
const routes = express.Router();

//Récupérer le profil de la pharmacie
/**
 * POST /api/pharmacie/profilpharmacie
 * @summary Récupérer le profil de la pharmacie
 * @tags Pharmacie
 * @param {string} request.body.required -Code l'utilisateur qui gère la pharmacie dont on veut récupérer le profil
 * @return {object} 201 - Profil pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.post("/profilpharmacie", (req, res) => {
  return controllerPharmacie.profilPharmacie(req, res);
});

//Ajouter une assurance à la liste des assurances acceptées
/**
 * @typedef {object} informationAjoutAssurance
 * @property {string} codePharmacie.required - Code de la pharmacie qui ajoute une assurance
 * @property {Array[]} liste_assurance.required - Nom de l'assurance à ajouter
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
routes.post("/ajouterassurance", (req, res) => {
  return controllerPharmacie.ajouterAssurance(req, res);
});

//Enregistrer une pharmacie
/**
 * @typedef {object} infosAjouterPharmacie -Informations nécéssaire à ajouter une pharmacie
 * @property {string} code_gerant.required - Code de l'utilisateur qui gère la pharmacie - application/x-www-form-urlencoded
 * @property {string} nom_pharmacie.required - Nom de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} numero_pharmacie.required - Numéros de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} horraires_ouverture.required - Les horaires d'ouverture de la pharmacie - application/x-www-form-urlencoded
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
routes.post("/ajouterPharmacie", upload.single("photo"), (req, res) => {
  return controllerPharmacie.ajouterPharmacie(req, res);
});

//Modifier les informations d'une pharmacie
/**
 * @typedef {object} infosMajPharmacie -Informations nécéssaire à ajouter une pharmacie
 * @property {string} code_gerant.required - Code de l'utilisateur qui gère la pharmacie - application/x-www-form-urlencoded
 * @property {string} nom_pharmacie - Nom de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} numero_pharmacie - Numéros de la pharmacie à enregistrer - application/x-www-form-urlencoded
 * @property {string} horraires_ouverture - Les horaires d'ouverture de la pharmacie - application/x-www-form-urlencoded
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
  controllerPharmacie.modifierPharmacie,
);

//Rechercher une pharmacie
/**
 * @typedef {object} infosRecherchePharmacie
 * @property {string} terme_saisi.required -Nom de l'assurance recherchée
 * @property {number} longitude -Longitude de la position de l'utilisateur
 * @property {number} latitude -Latitude de la position de l'utilisateur
 */
/**
 * GET /api/pharmacie/rechercher
 * @summary Rechercher  des pharmacies
 * @tags Pharmacie
 * @param {infosRecherchePharmacie} request.path.required -Les informations nécessaire à la récupération des
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
 * @property {number} limits -Limiter le nombre de résultat pour plus d'éfficacité
 * @property {number} longitude -Longitude de la position de l'utilisateur
 * @property {number} latitude -Latitude de la position de l'utilisateur
 * @property {string} adresse_utilisateur.required -Adresse fourni par l'utilisateur à l'inscription
 */
/**
 * GET /api/pharmacie
 * @summary Récupérer toutes les pharmacies
 * @tags Pharmacie
 * @param {infosToutePharmacie} request.path.required -Les informations nécessaire à la récupération des
 * @return {object} 201 - Pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.get("/", (req, res) => {
  return controllerPharmacie.toutePharmacies(req, res);
});

module.exports = routes;
