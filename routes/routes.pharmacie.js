const express = require("express");
const controllerPharmacie = require("../controllers/controller.pharmacie");

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
 * @property {string} nomAssurance.required - Nom de l'assurance à ajouter
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
routes.post("/ajoutassurance", (req, res) => {
  return controllerPharmacie.ajouterAssurance(req, res);
});

//Enregistrer une pharmacie
/**
 * @typedef {object} infosAjouterPharmacie -Informations nécéssaire à ajouter une pharmacie
 * @property {string} code_gerant.body.required - Code de l'utilisateur qui gère la pharmacie
 * @property {string} nom_pharmacie.body.required - Nom de la pharmacie à enregistrer
 * @property {string} photo_pharmacie.body.required - Photo de la pharmacie à enregistrer
 * @property {string} numeros_pharmacie.body.required - Numéros de la pharmacie à enregistrer
 * @property {string} email_pharmacie.body.required - Email de la pharmacie à enregistrer
 * @property {number} latitudePharmacie.body.required - latitude de la position de la pharmacie à enregistrer
 * @property {number} longitudePharmacie.body.required - longitude de la position de la pharmacie à enregistrer
 * @property {string} adresse_fournit.body.required - Adresse fournit par la pharmacie
 * @property {Array[]} liste_assurance_accepte.body.required - Liste des assurances acceptées
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
routes.post("/ajouterPharmacie", (req, res) => {
  return controllerPharmacie.ajouterPharmacie(req, res);
});

//Rechercher une pharmacie
/**
 * @typedef {object} infosRecherchePharmacie
 * @property {number} nom_assurance.required -Nom de l'assurance recherchée
 * @property {number} longitude -Longitude de la position de l'utilisateur
 * @property {number} latitude -Latitude de la position de l'utilisateur
 * @property {string} adresse_utilisateur.required -Adresse fourni par l'utilisateur à l'inscription
 */
/**
 * GET /api/pharmacie/rechercher
 * @summary Récupérer toutes les pharmacies
 * @tags Pharmacie
 * @param {infosRecherchePharmacie} request.path.required -Les informations nécessaire à la récupération des
 * @return {object} 201 - Pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.get("/rechercher", (req, res) => {
  return controllerPharmacie.toutePharmacies(req, res);
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
