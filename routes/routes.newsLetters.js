const express = require("express");
const controllerNewsletters = require("../controllers/controller.newsLetters");
const routes = express.Router();

//Abonnement aux newsLetters

/**
 * GET /api/newsLetters/abonnement
 * @summary Liste des abonnement de l'utilisateur
 * @tags NewsLetters
 * @param {string} codeUtilisateur.query.required - Code de l'utilisateur dont on veut la liste d'abonnement
 * @param {string} filtre.path - Code de l'utilisateur dont on veut la liste d'abonnement
 * @return {object} 201 - Liste des abonnement récupéré avec succès
 * @return {object} 400 - Aucuns abonnement en cours
 * @return {object} 409 - Impossible de récupérer la liste des abonnements
 * @return {object} 500 - Erreur serveur
 */
routes.get("/abonnement", (req, res) => {
  return controllerNewsletters.ListerAbonnementNewsletter(req, res);
});
/**
 * @typedef {object} infosAbonnement
 * @property {string} codePharmacie.required -Code de la pharmacie à laquelle on veut s'abonner
 * @property {string} codeUtilisateur.required -Code de l'utilisateur qui s'abonne aux newsLetters
 */
/**
 * POST /api/newsLetters/sabonner
 * @summary S'abonner aux newLetters
 * @tags NewsLetters
 * @param {infosAbonnement} request.body.required -Paramètres d'abonnement aux newsLetters
 * @return {object} 201 - Abonnement éffectué avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Abonnement impossible
 * @return {object} 500 - Erreur serveur
 */
routes.post("/sabonner", (req, res) => {
  return controllerNewsletters.sabonner(req, res);
});

/**
 * PUT /api/newsLetters/etatabonnement
 * @summary Mettre à jour l'abonnement aux newsletters
 * @tags NewsLetters
 * @param {string} request.body -Code pharmacie pour l'abonnement
 * @param {string} request.body -Code de l'utilisateur qui s'abonne
 * @return {object} 201 - Abonnement mis à jour avec succès
 * @return {object} 400 - Abonnement introuvable
 * @return {object} 409 - Abonnement impossible
 * @return {object} 500 - Erreur serveur
 */
routes.put("/etatabonnement", (req, res) => {
  return controllerNewsletters.etatabonnement(req, res);
});

/**
 * DELETE /api/newsLetters/supprimerabonnement
 * @summary Supprimer un abonnement au newsLetters d'une pharmacie
 * @tags NewsLetters
 * @param {string} request.body.required -Code pharmacie pour l'abonnement
 * @param {string} request.body.required -Code de l'utilisateur qui s'abonne
 * @return {object} 201 - Abonnement supprimé avec succès
 * @return {object} 400 - Abonnement introuvable
 * @return {object} 409 - Suppression de l'abonnement impossible
 * @return {object} 500 - Erreur serveur
 */
routes.delete("/supprimerabonnement", (req, res) => {
  return controllerNewsletters.supprimerabonnement(req, res);
});
module.exports = routes;
