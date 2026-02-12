const express = require("express");

const modelPharmacie = require("../models/pharmacie");

class controllerPharmacie {
  //Récupérer le profile de la pharmacie
  static async profilPharmacie(req, res) {
    const { codeUtilisateur } = req.body;
    const reponse = await modelPharmacie(codeUtilisateur);
    return res.json(reponse);
  }

  //Ajouter une assurance à la liste d'assurance acceptée
  static async ajouterAssurance(req, res) {
    const { codePharmacie, nomAssurance } = req.body;
    const reponse = await modelPharmacie.ajouterAssurance(
      codePharmacie,
      nomAssurance,
    );
    return res.json(reponse);
  }
  //Récupérer toutes les pharmacies
  static async toutePharmacies(req, res) {
    const { limits } = req.params;
    const reponse = await modelPharmacie.toutePharmacies(limits);
    return res.json(reponse);
  }
}
module.exports = controllerPharmacie;
