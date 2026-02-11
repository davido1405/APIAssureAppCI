const express = require("express");

class controllerNewsletters {
  //Récupérer la liste des abonnements d'un utilisateur
  static async abonnement(req, res) {
    const { codeUtilisateur } = req.params;
    const reponse = modelNewsletter.abonnement(codeUtilisateur);
    return res.json(reponse);
  }

  //Souscrir à un abonnement
  static async sabonner(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = modelNewsletter.sabonner(codePharmacie, codeUtilisateur);
    return res.json(reponse);
  }

  //Activer ou désactiver l'abonnement
  static async etatabonnement(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = modelNewsletter.etatabonnement(
      codePharmacie,
      codeUtilisateur,
    );
    return res.json(reponse);
  }

  //Supprimer l'abonnement
  static async supprimerabonnement(req, res) {
    const { codePharmacie, codeUtilisateur } = req.body;
    const reponse = modelNewsletter.supprimerabonnement(
      codePharmacie,
      codeUtilisateur,
    );
    return res.json(reponse);
  }
}

module.exports = controllerNewsletters;
