const express = require("express");
const modelAssurance = require("../models/assurances");

class controllerAssurances {
  //Récupérer la liste des assurances du système
  static async listeAssurance(req, res) {
    try {
      const reponse = await modelAssurance.listeAssurance();
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.assurances => listeAssurance erreur: ${error.message}`,
      );
    }
  }
  //Ajouter une assurance au système
  static async ajouterAssurance(req, res) {
    try {
      const { nomAssurance } = req.body;
      const reponse = await modelAssurance.ajouterAssurance(nomAssurance);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.assurances => ajouterAssurance erreur: ${error.message}`,
      );
    }
  }
  //Modifier une assurance
  static async modifierAssurance(req, res) {
    try {
      const { id_assurance, nouvelle_valeur } = req.query;
      const reponse = await modelAssurance.modifierAssurance(
        id_assurance,
        nouvelle_valeur,
      );
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.assurances => modifierAssurance erreur: ${error.message}`,
      );
    }
  }
  //désactiver une assurance
  static async desactiverAssurance(req, res) {
    try {
      const { id_assurance } = req.query;
      const reponse = await modelAssurance.desactiverAssurance(id_assurance);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.assurances => desactiverAssurance erreur: ${error.message}`,
      );
    }
  }
  //activer une assurance
  static async activerAssurance(req, res) {
    try {
      const { id_assurance } = req.query;
      const reponse = await modelAssurance.activerAssurance(id_assurance);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.assurances => activerAssurance erreur: ${error.message}`,
      );
    }
  }
}
module.exports = controllerAssurances;
