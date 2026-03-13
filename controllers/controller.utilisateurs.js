const express = require("express");
const modelUtilisateur = require("../models/utilisateur");
const { messaging } = require("firebase-admin");

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
      ville_utilisateur,
      adresseUtilisateur,
    } = req.body;
    const reponse = await modelUtilisateur.inscription(
      nomUtilisateur,
      prenomUtilisateur,
      numeroUtilisateur,
      codePinUtilisateur,
      type_utilisateur,
      assuranceUtilisateur,
      ville_utilisateur,
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
    const { code_utilisateur } = req.body;
    const reponse = await modelUtilisateur.profilUtilisateur(code_utilisateur);
    return res.json(reponse);
  }

  //Réinitialiser le mot de passe
  static async recoverPassword(req, res) {
    const { numeroUtilisateur } = req.body;
    const reponse = await modelUtilisateur.recoverPassword(numeroUtilisateur);
    return res.json(reponse);
  }

  //Ajouter assurance utiliser
  static async ajouterAssurance(req, res) {
    const { codeUtilisateur, nom_assurance } = req.body;
    const reponse = await modelUtilisateur.ajouterAssurance(
      codeUtilisateur,
      nom_assurance,
    );

    return res.json(reponse);
  }

  //Envoyer localisation
  static async envoyerLocalisation(req, res) {
    const [code_utilisateur, latitude, longitude] = req.path;
    if (!(code_utilisateur || latitude || longitude)) {
      return res.status(400).json({
        success: false,
        message: "Veuillez vérifier tous les champs",
      });
    }
    const reponse = await modelUtilisateur.envoyerLocalisation(
      code_utilisateur,
      latitude,
      longitude,
    );

    if (reponse) {
      return res.status(200).json(reponse);
    } else {
      return res.status(500).json({
        success: false,
        message: "Erreur server",
      });
    }
  }

  //Envoyer token
  static async envoyerFCMToken(req, res) {
    const { fcm_token, code_utilisateur } = req.body;

    if (!(fcm_token && code_utilisateur)) {
      return res.status(400).json({
        success: false,
        message: "Paramètre manquant. Veuillez vérifier tous les champs",
      });
    }
    try {
      const resultat = await modelUtilisateur.envoyerFCMToken(
        code_utilisateur,
        fcm_token,
      );

      if (resultat.success) {
        return res.status(200).json(resultat);
      } else {
        return res.status(400).json(resultat);
      }
    } catch (error) {
      console.log("Une erreur s'est produite: ", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de l'enregistrement du token",
      });
    }
  }
}

module.exports = controllerUtilisateur;
