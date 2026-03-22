const express = require("express");
const modelNotification = require("../models/notifications");

class controllerNotification {
  /**
   * Marquer une annonce lu
   */
  static async LireNotification(req, res) {
    try {
      const { id_annonce } = req.query;
      const { code_utilisateur } = req.body;

      if (!code_utilisateur) {
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      const resultat = await modelNotification.marquerLu(
        id_annonce,
        code_utilisateur,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      console.error("❌ Erreur controller:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  /**
   * Récupérer toutes les annonces
   */
  static async getToutesLesNotifications(req, res) {
    try {
      const { code_utilisateur } = req.query;
      const limit = parseInt(req.query.limit) || 20;

      // ✅ Validation
      if (!code_utilisateur) {
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      const resultat = await modelNotification.getToutesLesNotifications(
        code_utilisateur,
        limit,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      console.error("❌ Erreur controller:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  /**
   * Supprimer une annonce
   */
  static async supprimerNotification(req, res) {
    try {
      const { id_annonce } = req.query;
      const { code_utilisateur } = req.body;

      if (!code_utilisateur) {
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      const resultat = await modelNotification.supprimerNotification(
        id_annonce,
        code_utilisateur,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      console.error("❌ Erreur controller:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
}
module.exports = controllerNotification;
