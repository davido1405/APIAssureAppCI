const express = require("express");
const controllerPharmacie = require("../controllers/controller.pharmacie");

const routes = express.Router();

//Récupérer le profil de la pharmacie
/**
 * POST /api/pharmacie/profilpharmacie
 * @summary Récupérer le profil de la pharmacie
 * @tags Pharmacie
 * @param {string} request.body.required -Code l'utilisateur qui gère la pharmacie dont on veut récupérer le profil
 * @return {object} 201 - Prodil pharmacie récupérées avec succès
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

//toute les pharmacies
/**
 * GET /api/pharmacie
 * @summary Récupérer toutes les pharmacies
 * @tags Pharmacie
 * @param {number} limite.path.required -limiter les reponses
 * @return {object} 201 - Pharmacie récupérées avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 500 - Erreur serveur
 */
routes.get("/", (req, res) => {
  return controllerPharmacie.toutePharmacies(req, res);
});

module.exports = routes;
