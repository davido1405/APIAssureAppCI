// routes/routes.annonce.js

const express = require("express");
const routes = express.Router();

const controllerAnnonce = require("../controllers/controller.annonces");

// ============================================
// ENVOYER UNE ANNONCE
// ============================================

/**
 * @typedef {object} Annonce - Structure d'une annonce avec les différents champs
 * @property {string} titre.required - Titre de l'annonce (max 255 caractères)
 * @property {string} contenu.required - Contenu de l'annonce
 * @property {string} code_gerant.required - Code du gérant qui envoie l'annonce
 * @property {string} type_annonce.required - Type d'annonce (Information, Promotion, Urgence)
 */

/**
 * POST /api/annonces/envoyer
 * @summary Envoyer une annonce avec notification push aux abonnés
 * @tags Annonces
 * @param {Annonce} request.body.required - Données de l'annonce à envoyer
 * @return {object} 200 - Annonce envoyée avec succès
 * @return {object} 400 - Données invalides ou erreur métier
 * @return {object} 500 - Erreur serveur
 * @example request - Exemple de requête
 * {
 *   "titre": "Promotion -20% ce weekend",
 *   "contenu": "Profitez de -20% sur tous nos produits ce weekend. Valable jusqu'à dimanche 23h59.",
 *   "code_gerant": "GER001",
 *   "type_annonce": "Promotion"
 * }
 * @example response - 200 - Exemple de réponse succès
 * {
 *   "success": true,
 *   "message": "Annonce envoyée avec succès",
 *   "id_annonce": 42,
 *   "nb_abonnes": 150,
 *   "nb_notifications_envoyees": 150,
 *   "nb_notifications_recues": 145
 * }
 */
routes.post("/envoyer", controllerAnnonce.envoyerAnnonce);

// ============================================
// RÉCUPÉRER ANNONCES D'UNE PHARMACIE
// ============================================

/**
 * GET /api/annonces/pharmacie/{code_pharmacie}
 * @summary Récupérer les annonces d'une pharmacie spécifique
 * @tags Annonces
 * @param {string} code_pharmacie.path.required - Code de la pharmacie
 * @param {number} limit.query - Nombre max d'annonces à retourner (défaut: 10)
 * @return {object} 200 - Liste des annonces
 * @return {object} 400 - Erreur
 * @return {object} 500 - Erreur serveur
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id_annonce": 42,
 *       "titre": "Promotion -20%",
 *       "contenu": "Profitez de...",
 *       "date_publication": "2026-03-12T10:30:00.000Z",
 *       "libelle_type_annonce": "Promotion"
 *     }
 *   ]
 * }
 */
routes.get(
  "/pharmacie/:code_pharmacie",
  controllerAnnonce.getAnnoncesParPharmacie,
);

// ============================================
// RÉCUPÉRER TOUTES LES ANNONCES
// ============================================

/**
 * GET /api/annonces/toutes
 * @summary Récupérer toutes les annonces (fil d'actualité)
 * @tags Annonces
 * @param {number} limit.query - Nombre max d'annonces (défaut: 50)
 * @return {object} 200 - Liste des annonces
 * @return {object} 500 - Erreur serveur
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id_annonce": 42,
 *       "titre": "Promotion -20%",
 *       "contenu": "Profitez de...",
 *       "date_publication": "2026-03-12T10:30:00.000Z",
 *       "libelle_type_annonce": "Promotion",
 *       "nom_pharmacie": "Pharmacie Centrale",
 *       "photo_pharmacie": "https://..."
 *     }
 *   ]
 * }
 */
routes.get("/toutes", controllerAnnonce.getToutesLesAnnonces);

// ============================================
// SUPPRIMER UNE ANNONCE
// ============================================

/**
 * @typedef {object} SupprimerAnnonceBody
 * @property {string} code_gerant.required - Code du gérant qui supprime
 */

/**
 * DELETE /api/annonces/{id_annonce}
 * @summary Supprimer une annonce
 * @tags Annonces
 * @param {number} id_annonce.path.required - Identifiant de l'annonce à supprimer
 * @param {SupprimerAnnonceBody} request.body.required - Code du gérant
 * @return {object} 200 - Annonce supprimée avec succès
 * @return {object} 400 - Impossible de supprimer (non autorisé ou introuvable)
 * @return {object} 500 - Erreur serveur
 * @example request - Exemple de requête
 * {
 *   "code_gerant": "GER001"
 * }
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "message": "Annonce supprimée avec succès"
 * }
 */
routes.delete("/:id_annonce", controllerAnnonce.supprimerAnnonce);

module.exports = routes;
