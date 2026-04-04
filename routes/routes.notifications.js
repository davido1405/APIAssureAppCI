// routes/routes.annonce.js

const express = require("express");
const routes = express.Router();

const controllerNotification = require("../controllers/controller.notifications");
const logger = require("../logger");

// ============================================
// RÉCUPÉRER LES NOTIFICATION D'UN UTILISATEUR
// ============================================

/**
 * GET /api/notifications
 * @summary Récupérer les notifications d'un utilisateur
 * @tags Notifications
 * @param {string} code_utilisateur.path.required - Code de l'utilisateur
 * @param {number} limit.query - Nombre max d'annonces à retourner (défaut: 10)
 * @return {object} 200 - Liste des annonces
 * @return {object} 400 - Erreur
 * @return {object} 500 - Erreur serveur
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "data": [
 *     {
            "id_annonce": 4,
            "titre": "Restockage d'anti-douleur",
            "contenu": "Desormais votre pharmacie accepte les paiement par Wave",
            "date_publication": "2026-03-22 15:04:29",
            "libelle_statut": "Non lu",
            "libelle_type_annonce": "Information",
            "nom_pharmacie": "Pharmacie test",
            "photo_pharmacie": "https://..."
        }
 *   ]
 * }
 */
routes.get("/", (req, res) => {
  return controllerNotification.getToutesLesNotifications;
});

// ============================================
// MARQUER UNE NOTIFICATION LU
// ============================================

/**
 * @typedef {object} LireNotificationBody
 * @property {number} id_annonce.path.required - Id de la notification à marquer lu
 * @property {string} code_utilisateur.required - Code de l'utilisateur
 */

/**
 * PUT /api/notifications/lireNotifications
 * @summary Lire une notification
 * @tags Notifications
 * @param {number} id_annonce.path.required - Identifiant de l'annonce à marquer Lu
 * @param {LireNotificationBody} request.body.required - Code de l'utilisateur
 * @return {object} 200 - Annonce supprimée avec succès
 * @return {object} 400 - Impossible de supprimer (non autorisé ou introuvable)
 * @return {object} 500 - Erreur serveur
 * @example request - Exemple de requête
 * {
 *   "code_utilisateur": "GER001"
 * }
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "message": "Notification supprimée avec succès"
 * }
 */
routes.put("/lireNotifications", (req, res) => {
  return controllerNotification.LireNotification;
});

// ============================================
// SUPPRIMER UNE NOTIFICATION
// ============================================

/**
 * @typedef {object} SupprimerNotificationBody
 * @property {string} code_utilisateur.required - Code de l'utilisateur
 */

/**
 * DELETE /api/notifications/
 * @summary Supprimer une notification
 * @tags Notifications
 * @param {number} id_annonce.path.required - Identifiant de l'annonce à supprimer
 * @param {SupprimerNotificationBody} request.body.required - Code de l'utilisateur
 * @return {object} 200 - Annonce supprimée avec succès
 * @return {object} 400 - Impossible de supprimer (non autorisé ou introuvable)
 * @return {object} 500 - Erreur serveur
 * @example request - Exemple de requête
 * {
 *   "code_utilisateur": "GER001"
 * }
 * @example response - 200 - Exemple de réponse
 * {
 *   "success": true,
 *   "message": "Annonce supprimée avec succès"
 * }
 */
routes.delete("/supprimerNotification", (req, res) => {
  controllerNotification.supprimerNotification;
});

module.exports = routes;
