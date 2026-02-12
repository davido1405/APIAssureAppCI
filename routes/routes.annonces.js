const express = require("express");
const routes = express.Router();

const controllerAnnonce = require("../controllers/controller.annonces");

//Envoyer une annonce

/**
 * @typedef {object} Annonce - Structure d'une annonce avec les différents champs
 * @property {string} titre.required - Titre de l'annonce
 * @property {string} contenu.required - Contenu de l'annonce
 * @property {string} codePharmacie.required - Code de la pharmacie qui envoie l'annonce
 * @property {string} typeAnnonce.required - Le type d'annonce dont il s'agit
 */
/**
 * POST /api/anonnces/envoyerannonce
 * @summary Envoyer une annonce
 * @tags Annonces
 * @param {Annonce} request.body.required - Annonce à envoyer
 * @return {object} 201 - Annonce envoyer avec succès
 * @return {object} 400 - Impossible d'envoyer l'annonce
 * @return {object} 500 - Erreur server
 */
routes.post("/envoyerannoce", (req, res) => {
  return controllerAnnonce.envoyerAnnonce(req, res);
});

//supprimer une annonces
/**
 * DELETE /api/annonces/supprimerannonce
 * @summary Supprimer une annonce
 * @tags Annonces
 * @param {number} id_annonce - L'identifiant de l'annonce à supprimer
 * @param {string} codePharmacie - Le code de la pharmacie qui à emit l'annonce
 * @return {object} 201 - Annonce supprimé avec succès
 * @return {object} 400 - Impossible de supprimer l'annonce
 * @return {object} 500 - Erreur server
 */
routes.delete("/suppriemrannonce", (req, res) => {
  return controllerAnnonce.supprimerAnnonce(req, res);
});
module.exports = routes;
