const express = require("express");
const routes = express.Router();
const AbonnementController = require("../controllers/controller.abonnements");
const logger = require("../logger");
/**
 * GET /api/abonnements/forfaits
 * @summary Récupérer tous les forfaits disponible
 * @tags Abonnements
 * @return {object} 200 - Forfait récupéré avec succès !
 * @return {object} 400 - Aucun forfaits récupéré
 * @return {object} 500 - Erreur serveur
 */
// Récupérer tous les forfaits
routes.get("/forfaits", AbonnementController.recupererForfaits);

// Récupérer l'abonnement actif d'une pharmacie

/**
 * GET /api/abonnements/actif
 * @summary Récupérer le forfait de la pharmacie
 * @tags Abonnements
 * @param {string} code_pharmacie.path - Code de la pharmacie dont on veut récupérer l'abonnement actif
 * @return {object} 200 - Forfait récupéré avec succès !
 * @return {object} 400 - Aucun forfaits récupéré
 * @return {object} 500 - Erreur serveur
 */
routes.get("/actif", (req, res) => {
  return AbonnementController.recupererAbonnementActif(req, res);
});

// Vérifier l'accès à une fonctionnalité

/**
 * POST /api/abonnements/verifier-acces
 * @summary Vérifier l'accès à une fonctionnalité selon le forfait de la pharmacie
 * @tags Abonnements
 * @return {object} 200 - Accès autorisé !
 * @return {object} 400 - Accès non autorisé
 * @return {object} 500 - Erreur serveur
 */
routes.post(
  "/verifier-acces",
  AbonnementController.verifierAccesFonctionnalite,
);
/**
 * @typedef {object} InformationSouscription - Informations nécessaire pour souscrire à un abonnement
 * @property {string} code_gerant.required - Code de la pharmacie qui souscrit
 * @property {string} nom_forfait.required - Le forfait pour lequel on veut souscrire
 * @property {string} mode_paiement.required - Le mode de paiement
 * @property {string} reference_paiement - La référence du paiement
 */
/**
 * POST /api/abonnements/souscrire
 * @summary Souscrire à un forfait
 * @tags Abonnements
 * @param {InformationSouscription} request.body - Les informations de souscription
 * @return {object} 200 - Souscription éffectué avec succès !
 * @return {object} 400 - Impossible de souscrir au forfait
 * @return {object} 500 - Erreur serveur
 */
// Souscrire à un forfait
routes.post("/souscrire", AbonnementController.souscrireForfait);

/**
 * GET /api/abonnements/historique
 * @summary Récupérer l'historique de tous les forfaits souscrit
 * @tags Abonnements
 * @return {object} 200 - Souscription éffectué avec succès !
 * @return {object} 400 - Impossible de souscrir au forfait
 * @return {object} 500 - Erreur serveur
 */
// Historique des abonnements
routes.get(
  "/historique/:code_pharmacie",
  AbonnementController.historiqueAbonnements,
);

module.exports = routes;
