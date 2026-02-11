const express = require("express");
const modelAssurance = require("../models/assurances");

class controllerAssurances {
  //Récupérer la liste des assurances du système
  static async listeAssurance(req, res) {
    const reponse = modelAssurance.listeAssurance();
    return res.json(reponse);
  }

  //Ajouter une assurance au système
  static async ajouterAssurance(req, res) {
    const { nomAssurance } = req.body;
    const reponse = modelAssurance.ajouterAssurance(nomAssurance);
    return res.json(reponse);
  }
  //Modifier une assurance
  static async modifierAssurance(req, res) {
    const { identifiantAssurance } = req.params;
    const reponse = modelAssurance.modifierAssurance(identifiantAssurance);
    return res.json(reponse);
  }

  //supprimer une assurance
  static async supprimerAssurance(req, res) {
    const { identifiantAssurance } = req.params;
    const reponse = modelAssurance.supprimerAssurance(identifiantAssurance);
    return res.json(reponse);
  }
}
module.exports = controllerAssurances;
