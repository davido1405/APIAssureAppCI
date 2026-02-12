const express = require("express");
const routes = express.Router();
const controllerAbonnementPharmacie = require("../controllers/controller.abonnementPharmacie");
//Payer l'abonnement de la pharmacie
/**
 * POST /api/abonnementPharmacie/payerAbonnement
 * @summary Payer l'abonnement de la pharmacie
 * @tags Payer Abonnement
 * @param {string} codePharmacie.required - Code de la pharmacie qui effectue l'abonnement
 * @return {object} 201 - Abonnement effectué avec succès
 * @return {object} 400 - Impossible d'éffectuer l'abonnement pour le moment
 * @return {object} 500 - Erreur server
 */
routes.post("/payerAbonnement", (req, res) => {
  return controllerAbonnementPharmacie.payerAbonnement(req, res);
});
module.exports = routes;
