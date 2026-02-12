const express = require("express");
const modelUtilisateur = require("../models/utilisateur");

class controllerUtilisateur {
  //Inscription utilisateur
  static async inscription(req, res) {
    const {
      nomUtilisateur,
      prenomUtilisateur,
      numeroUtilisateur,
      codePinUtilisateur,
      type_utilisateur,
      assuranceUtilisateur,
      adresseUtilisateur,
    } = req.body;
    const reponse = await modelUtilisateur.inscription(
      nomUtilisateur,
      prenomUtilisateur,
      numeroUtilisateur,
      codePinUtilisateur,
      type_utilisateur,
      assuranceUtilisateur,
      adresseUtilisateur,
    );
    return res.json(reponse);
  }

  //Connexion utilisateur
  static async connexion(req, res) {
    const { numeroUtilisateur, codePinUtilisateur } = req.body;
    const reponse = await modelUtilisateur.connexion(
      numeroUtilisateur,
      codePinUtilisateur,
    );
    return res.json(reponse);
  }

  //Récupérer le profil utilisateur
  static async profilUtilisateur(req, res) {
    const { codeUtilisateur } = req.body;
    const reponse = await modelUtilisateur.profilUtilisateur(codeUtilisateur);
    return res.json(reponse);
  }

  //Réinitialiser le mot de passe
  static async recoverPassword(req, res) {
    const { numeroUtilisateur } = req.body;
    const reponse = await modelUtilisateur.recoverPassword(numeroUtilisateur);
    return res.json(reponse);
  }
}

module.exports = controllerUtilisateur;
