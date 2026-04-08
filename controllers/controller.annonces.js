const express = require("express");
const modelAnnonces = require("../models/annonces");
const modelAbonnement = require("../models/abonnements");
const { default: logger } = require("../logger");

class controllerAnnonces {
  /**
   * Envoyer une annonce
   */
  static async envoyerAnnonce(req, res) {
    try {
      const { titre, contenu, code_gerant, type_annonce } = req.body;

      // Validation
      if (!titre || !contenu || !code_gerant || !type_annonce) {
        return res.status(400).json({
          success: false,
          message: "Tous les champs sont requis",
        });
      }

      await modelAbonnement.verifierAccesFonctionnalite(
        code_gerant,
        type_annonce.toLowerCase() != "annonces" ? "NEWSLETTER" : "ANNONCES",
      );

      const resultat = await modelAnnonces.envoyerAnnonce(
        titre,
        contenu,
        code_gerant,
        type_annonce,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.annonces => envoyerAnnonce erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  /**
   * Récupérer les annonces d'une pharmacie
   */
  static async getAnnoncesParPharmacie(req, res) {
    try {
      const { code_gerant } = req.query;
      const limit = parseInt(req.query.limit) || 10;

      const resultat = await modelAnnonces.getAnnoncesParPharmacie(
        code_gerant,
        limit,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.annonces => getAnnoncesParPharmacie erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  /**
   * Récupérer toutes les annonces
   */
  static async getToutesLesAnnonces(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const resultat = await modelAnnonces.getToutesLesAnnonces(limit);

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.annonces => getToutesLesAnnonces erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  /**
   * Supprimer une annonce
   */
  static async supprimerAnnonce(req, res) {
    try {
      const { id_annonce } = req.params;
      const { code_gerant } = req.body;

      if (!code_gerant) {
        return res.status(400).json({
          success: false,
          message: "Code gérant requis",
        });
      }

      const resultat = await modelAnnonces.supprimerAnnonce(
        id_annonce,
        code_gerant,
      );

      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.annonces => supprimerAnnonce erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
}
module.exports = controllerAnnonces;
