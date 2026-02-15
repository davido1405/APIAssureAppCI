const express = require("express");
const modelAssurance = require("../models/assurances");

class controllerAssurances {
  //Récupérer la liste des assurances du système
  static async listeAssurance(req, res) {
    const reponse = await modelAssurance.listeAssurance();
    return res.json(reponse);
  }
  //Ajouter une assurance au système
  static async ajouterAssurance(req, res) {
    const { nomAssurance } = req.body;
    const reponse = await modelAssurance.ajouterAssurance(nomAssurance);
    return res.json(reponse);
  }
  //Modifier une assurance
  static async modifierAssurance(req, res) {
    const { id_assurance, nouvelle_valeur } = req.query;
    const reponse = await modelAssurance.modifierAssurance(
      id_assurance,
      nouvelle_valeur,
    );
    return res.json(reponse);
  }
  //désactiver une assurance
  static async desactiverAssurance(req, res) {
    const { id_assurance } = req.query;
    const reponse = await modelAssurance.desactiverAssurance(id_assurance);
    return res.json(reponse);
  }
  //activer une assurance
  static async activerAssurance(req, res) {
    const { id_assurance } = req.query;
    const reponse = await modelAssurance.activerAssurance(id_assurance);
    return res.json(reponse);
  }
}
module.exports = controllerAssurances;
