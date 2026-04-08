const logger = require("../logger");
const AbonnementModel = require("../models/abonnements");

class AbonnementController {
  // Récupérer tous les forfaits disponibles
  static async recupererForfaits(req, res) {
    try {
      const forfaits = await AbonnementModel.recupererForfaits();

      return res.status(200).json({
        success: true,
        data: forfaits,
      });
    } catch (error) {
      logger.error(
        `Erreur controller.abonnements => recupererForfaits erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  // Récupérer l'abonnement actif d'une pharmacie
  static async recupererAbonnementActif(req, res) {
    try {
      const { code_pharmacie } = req.query;

      const abonnement =
        await AbonnementModel.recupererAbonnementActif(code_pharmacie);

      return res.status(200).json({
        success: true,
        data: abonnement,
      });
    } catch (error) {
      logger.error(
        `Erreur controller.abonnements => recupererAbonnementActif erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  // Vérifier l'accès à une fonctionnalité
  static async verifierAccesFonctionnalite(req, res) {
    try {
      const { code_pharmacie, code_fonctionnalite } = req.body;

      const resultat = await AbonnementModel.verifierAccesFonctionnalite(
        code_pharmacie,
        code_fonctionnalite,
      );

      return res.status(200).json({
        success: true,
        data: resultat,
      });
    } catch (error) {
      logger.error(
        `Erreur controller.abonnements => verifierAccesFonctionnalite erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  // Souscrire à un forfait
  static async souscrireForfait(req, res) {
    try {
      const { code_gerant, nom_forfait, mode_paiement, reference_paiement } =
        req.body;

      if (!code_gerant || !nom_forfait || !mode_paiement) {
        return res.status(400).json({
          success: false,
          message: "Paramètres manquants",
        });
      }

      const resultat = await AbonnementModel.souscrireForfait(
        code_gerant,
        nom_forfait,
        mode_paiement,
        reference_paiement,
      );

      return res.status(resultat.success ? 201 : 400).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.abonnements => souscrireForfait erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }

  // Historique des abonnements
  static async historiqueAbonnements(req, res) {
    try {
      const { code_pharmacie } = req.params;

      const historique =
        await AbonnementModel.historiqueAbonnements(code_pharmacie);

      return res.status(200).json({
        success: true,
        data: historique,
      });
    } catch (error) {
      logger.error(
        `Erreur controller.abonnements => historiqueAbonnements erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
}

module.exports = AbonnementController;
