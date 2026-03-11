const AbonnementModel = require("../models/abonnements");

// Middleware pour vérifier l'accès à une fonctionnalité
const verifierAccesFonctionnalite = (code_fonctionnalite) => {
  return async (req, res, next) => {
    try {
      // Récupérer le code pharmacie (depuis le token, session, ou body)
      const code_pharmacie =
        req.body.code_pharmacie || req.params.code_pharmacie;

      if (!code_pharmacie) {
        return res.status(400).json({
          success: false,
          message: "Code pharmacie manquant",
        });
      }

      // Vérifier l'accès
      const resultat = await AbonnementModel.verifierAccesFonctionnalite(
        code_pharmacie,
        code_fonctionnalite,
      );

      if (!resultat.acces) {
        return res.status(403).json({
          success: false,
          message: resultat.raison,
          upgrade_required: true,
        });
      }

      // Enregistrer l'utilisation si limite définie
      if (resultat.limite !== null) {
        await AbonnementModel.enregistrerUtilisation(
          code_pharmacie,
          code_fonctionnalite,
        );
      }

      // Passer à la suite
      next();
    } catch (error) {
      console.error("Erreur middleware verifierAcces:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  };
};

module.exports = { verifierAccesFonctionnalite };
