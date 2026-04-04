const express = require("express");
const modelNotification = require("../models/notifications");
const logger = require("../logger");

class controllerNotification {
  /**
   * Marquer une annonce lu
   */
  static async LireNotification(req, res) {
    const { id_annonce } = req.query;
    const { code_utilisateur } = req.body;
    try {
      if (!code_utilisateur) {
        logger.info(
          "Tentative de consultation de notification sans code_utilisateur",
        );
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      logger.info(
        `Consultation de notification... => utilisateur: ${code_utilisateur}`,
      );
      const resultat = await modelNotification.marquerLu(
        id_annonce,
        code_utilisateur,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur consultation notification => utilisateur: ${code_utilisateur} erreur: ${error.message}`,
      );
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
    const { code_utilisateur } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    try {
      // ✅ Validation
      if (!code_utilisateur) {
        logger.info(
          `Tentative de récupération des notifications sans code utilisateur`,
        );
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      logger.info(
        `Récupération des notifications... => utilisateur: ${code_utilisateur}`,
      );
      const resultat = await modelNotification.getToutesLesNotifications(
        code_utilisateur,
        limit,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des notifications utilisateur: ${code_utilisateur} erreur: ${error.message}`,
      );
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
    const { id_annonce } = req.query;
    const { code_utilisateur } = req.body;
    try {
      if (!code_utilisateur) {
        logger.info(
          `Tentative de suppression de notification sans code utilisateur`,
        );
        return res.status(400).json({
          success: false,
          message: "Code utilisateur requis",
        });
      }

      logger.info(
        `Tentative de suppression de notification... => utilisateur: ${code_utilisateur} id_notification: ${id_annonce}`,
      );
      const resultat = await modelNotification.supprimerNotification(
        id_annonce,
        code_utilisateur,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur de suppression des notifications erreur: ${error.message}`,
      );
      console.error("❌ Erreur controller:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
}
module.exports = controllerNotification;
