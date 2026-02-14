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

  //Rechercher une pharmacie
  static async rechercherPharmacie(req, res) {
    const { nom_assurance, longitude, latitude, adresse_utilisateur } =
      req.params;
    const reponse = await modelPharmacie.rechercherPharmacie(
      nom_assurance,
      longitude,
      latitude,
      adresse_utilisateur,
    );
    return res.json(reponse);
  }
  //Récupérer toutes les pharmacies
  static async toutePharmacies(req, res) {
    const { limits } = req.params;
    const reponse = await modelPharmacie.toutePharmacies(limits);
    return res.json(reponse);
  }
  //Ajouter une pharmacie
  static async ajouterPharmacie(req, res) {
    const {
      code_gerant,
      nom_pharmacie,
      photo_pharmacie,
      numero_pharmacie,
      email_pharmacie,
      latitude_pharmacie,
      longitude_pharmacie,
      adresse_fournit,
      liste_assurance_accepte,
    } = req.body;
    const reponse = await modelPharmacie.ajouterPharmacie(
      code_gerant,
      nom_pharmacie,
      photo_pharmacie,
      numero_pharmacie,
      email_pharmacie,
      latitude_pharmacie,
      longitude_pharmacie,
      adresse_fournit,
      liste_assurance_accepte,
    );

    return res.json(reponse);
  }
}
module.exports = controllerPharmacie;
