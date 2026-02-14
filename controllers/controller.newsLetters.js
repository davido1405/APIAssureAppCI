const express = require("express");
const modelNewsletter = require("../models/newsLetters");

class controllerNewsletters {
  //Récupérer la liste des abonnements d'un utilisateur
  static async ListerAbonnementNewsletter(req, res) {
    const { codeUtilisateur, filtre } = req.query;
    const reponse = await modelNewsletter.ListerAbonnementNewsletter(
      codeUtilisateur,
      filtre,
    );
    return res.json(reponse);
  }

  //Souscrir à un abonnement
  static async sabonner(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = await modelNewsletter.sabonner(
      codePharmacie,
      codeUtilisateur,
    );
    return res.json(reponse);
  }

  //Activer ou désactiver l'abonnement
  static async etatabonnement(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = await modelNewsletter.etatabonnement(
      codePharmacie,
      codeUtilisateur,
    );
    return res.json(reponse);
  }

  //Supprimer l'abonnement
  static async supprimerabonnement(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = await modelNewsletter.supprimerabonnement(
      codePharmacie,
      codeUtilisateur,
    );
    return res.json(reponse);
  }
}

module.exports = controllerNewsletters;
