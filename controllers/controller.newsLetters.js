const express = require("express");
const modelNewsletter = require("../models/newsLetters");

class controllerNewsletters {
  //Récupérer la liste des abonnements d'un utilisateur
  static async ListerAbonnementNewsletter(req, res) {
    try {
      const { codeUtilisateur } = req.body;
      const reponse =
        await modelNewsletter.ListerAbonnementNewsletter(codeUtilisateur);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.newsLetters => ListerAbonnementNewsletter erreur: ${error.message}`,
      );
    }
  }

  //Souscrir à un abonnement
  static async sabonner(req, res) {
    try {
      const { codePharmacie, codeUtilisateur } = req.body;
      const reponse = await modelNewsletter.sabonner(
        codePharmacie,
        codeUtilisateur,
      );
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.newsLetters => sabonner erreur: ${error.message}`,
      );
    }
  }

  //Supprimer l'abonnement
  static async supprimerabonnement(req, res) {
    try {
      const { codePharmacie, codeUtilisateur } = req.body;
      const reponse = await modelNewsletter.supprimerabonnement(
        codePharmacie,
        codeUtilisateur,
      );
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.newsLetters => supprimerabonnement erreur: ${error.message}`,
      );
    }
  }
}

module.exports = controllerNewsletters;
