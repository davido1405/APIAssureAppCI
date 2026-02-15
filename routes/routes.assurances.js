const express = require("express");
const controllerAssurances = require("../controllers/controller.assurances");
const routes = express.Router();

/**
 * POST /api/assurance/ajouterassurance
 * @summary Ajouter une nouvelle assurance dans le système
 * @tags Assurance
 * @param {string} request.body.required - Nom de l'assurance à ajouter
 * @return {object} 201 - Assurances ajoutée avec succès
 * @return {object} 400 - Ajout impossible
 * @return {object} 500 - Erreur serveur
 */
routes.post("/ajouterassurance", (req, res) => {
  return controllerAssurances.ajouterAssurance(req, res);
});

/**
 * PUT /api/assurance/modifierassurance
 * @summary Modifier une assurance
 * @tags Assurance
 * @param {number} id_assurance.path.required - Identifiant de l'assurance à mettre à jour
 * @param {string} nouvelle_valeur.path.required - Nouvelle valeur
 * @return {object} 201 - Assurance mise à jour avec succès
 * @return {object} 400 - Mise à jour impossible
 * @return {object} 500 - Erreur serveur
 */
routes.put("/modifierassurance", (req, res) => {
  return controllerAssurances.modifierAssurance(req, res);
});

/**
 * PUT /api/assurance/desactiverassurance
 * @summary Désactiver une assurance
 * @tags Assurance
 * @param {number} id_assurance.path.required - Identifiant de l'assurance à supprimer
 * @return {object} 201 - Assurance supprimée avec succès
 * @return {object} 400 - Mise à jour impossible
 * @return {object} 500 - Erreur serveur
 */
routes.put("/desactiverassurance", (req, res) => {
  return controllerAssurances.desactiverAssurance(req, res);
});

/**
 * PUT /api/assurance/activerassurance
 * @summary Activer une assurance
 * @tags Assurance
 * @param {number} id_assurance.path.required - Identifiant de l'assurance à supprimer
 * @return {object} 201 - Assurance activée avec succès
 * @return {object} 400 - Mise à jour impossible
 * @return {object} 500 - Erreur serveur
 */
routes.put("/activerassurance", (req, res) => {
  return controllerAssurances.activerAssurance(req, res);
});

/**
 * GET /api/assurance
 * @summary Récupérer liste des assurances dans le système
 * @tags Assurance
 * @return {object} 201 - Liste des assurances récupérées avec succès
 * @return {object} 400 - Données introuvables
 * @return {object} 500 - Erreur serveur
 */
routes.get("/", (req, res) => {
  return controllerAssurances.listeAssurance(req, res);
});
module.exports = routes;
