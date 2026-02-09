const express = require("express");
const routes = express.Router();

//Abonnement aux newsLetters

/**
 * GET /api/newsLetters
 * @summary Liste abonnement
 * @tags NewsLetters
 * @param {string} codeUtilisateur.path.required - Code de l'utilisateur dont on veut la liste d'abonnement
 * @return {object} 201 - Liste des abonnement récupéré avec succès
 * @return {object} 400 - Aucuns abonnement en cours
 * @return {object} 409 - Impossible de récupérer la liste des abonnements
 * @return {object} 500 - Erreur serveur
 */
routes.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Liste de vos abonnement récupéré avec succès",
  });
});
/**
 * @typedef {object} infosAbonnement
 * @property {string} codePharmacie.body.required -Code de la pharmacie à laquelle on veut s'abonner
 * @property {string} codeUtilisateur.body.required -Code de l'utilisateur qui s'abonne aux newsLetters
 */
/**
 * POST /api/newsLetters/abonnement
 * @summary S'abonner aux newLetters
 * @tags NewsLetters
 * @param {infosAbonnement} request.body.required -Paramètres d'abonnement aux newsLetters
 * @return {object} 201 - Abonnement éffectué avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Abonnement impossible
 * @return {object} 500 - Erreur serveur
 */
routes.post("/abonnement", (req, res) => {
  return res.json({
    success: true,
    message: "Abonnement mis à jour",
  });
});
module.exports = routes;
