const express = require("express");

const routes = express.Router();

/**
 * @typedef {object} informationInscription
 * @property {string} nomUtilisateur.required -Nom de l'utilisateur
 * @property {string} prenomUtilisateur.required -Prenom de l'utilisateur
 * @property {string} numeroUtilisateur.required -Numéro de téléphone de l'utilisateur
 * @property {string} assuranceUtilisateur -Nom de l'assurance de l'utilisateur
 */

//Inscription utilisateur
/**
 * POST /api/utilisateur/inscription
 * @summary Inscription utilisateur
 * @tags Utilisateur
 * @param {informationInscription} request.body.required -paramètre de requete
 * @return {object} 201 - Utilisateur créé avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Utilisateur déjà existant
 * @return {object} 500 - Erreur serveur
 */
routes.post("/inscription", (req, res) => {
  return res.json({
    success: true,
    message: "Inscription page",
  });
});

//Connexion utilisateur
/**
 * @typedef {object} connexionInfos
 * @property {string} numeroUtilisateur.required -Numéro de téléphone de l'utilisateur pour la connexion
 * @property {string} codePinUtilisateur.required -Code pin utilisateur pour la connexion
 */
/**
 * POST /api/utilisateur/conneixon
 * @summary Connexion utilisateur
 * @tags Utilisateur
 * @param {connexionInfos} request.body.required -Paramètre de requete
 * @return {object} 201 - Utilisateur connecté avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 */
routes.post("/connexion", (req, res) => {
  return res.json({
    success: true,
    message: "Route connexion",
  });
});

/**
 * POST /api/utilisateur/profilutilisateur
 * @summary Profil utilisateur
 * @tags Utilisateur
 * @param {string} request.body.required -Code de l'utilisateur dont on veut le profil
 * @return {object} 201 - Profil utilisateur obtenu avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Profil utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 *
 */
routes.post("/profilUtilisateur", (req, res) => {
  return res.json({
    success: true,
    message: "Profil utilisateur recupéré avec succès",
  });
});
//Récupérer mot de passe
/**
 * POST /api/utilisateur/recoverpassword
 * @summary Récupérer le mot passe
 * @tags Utilisateur
 * @param {string} request.body.required -Numéro envoyer pour vérifier qui récupère le mot de passe
 * @return {object} 201 - Numéros vérifié avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 */
routes.post("/recoverpassword", (req, res) => {
  return res.json({
    success: true,
    message: "Numéro vérifier avec succès",
  });
});

module.exports = routes;
