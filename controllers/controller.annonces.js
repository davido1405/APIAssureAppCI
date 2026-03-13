const express = require("express");
const modelAnnonces = require("../models/annonces");

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

      const resultat = await Annonces.envoyerAnnonce(
        titre,
        contenu,
        code_gerant,
        type_annonce,
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
   * Récupérer les annonces d'une pharmacie
   */
  static async getAnnoncesParPharmacie(req, res) {
    try {
      const { code_pharmacie } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const resultat = await Annonces.getAnnoncesParPharmacie(
        code_pharmacie,
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
   * Récupérer toutes les annonces
   */
  static async getToutesLesAnnonces(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const resultat = await Annonces.getToutesLesAnnonces(limit);

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

      const resultat = await Annonces.supprimerAnnonce(id_annonce, code_gerant);

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
module.exports = controllerAnnonces;
