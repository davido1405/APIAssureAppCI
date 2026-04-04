const express = require("express");

const routes = express.Router();

const controllerUtilisateur = require("../controllers/controller.utilisateurs");
const { route } = require("./routes.annonces");
const logger = require("../logger");

/**
 * @typedef {object} informationInscription
 * @property {string} nomUtilisateur.required -Nom de l'utilisateur
 * @property {string} prenomUtilisateur.required -Prenom de l'utilisateur
 * @property {string} numeroUtilisateur.required -Numéro de téléphone de l'utilisateur
 * @property {string} codePinUtilisateur.required -Code pin de l'utilisateur
 * @property {string} type_utilisateur.required -Numéro de téléphone de l'utilisateur
 * @property {string} assuranceUtilisateur -Nom de l'assurance de l'utilisateur
 * @property {string} ville_utilisateur.required -Ville de résidence de l'utilisateur
 * @property {string} adresseUtilisateur -Adresse que l'utilisateur fourni
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
  return controllerUtilisateur.inscription(req, res);
});

//Connexion utilisateur
/**
 * @typedef {object} connexionInfos
 * @property {string} numeroUtilisateur.required -Numéro de téléphone de l'utilisateur pour la connexion
 * @property {string} codePinUtilisateur.required -Code pin utilisateur pour la connexion
 */
/**
 * POST /api/utilisateur/connexion
 * @summary Connexion utilisateur
 * @tags Utilisateur
 * @param {connexionInfos} request.body.required -Paramètre de requete
 * @return {object} 201 - Utilisateur connecté avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 */
routes.post("/connexion", (req, res) => {
  return controllerUtilisateur.connexion(req, res);
});
/**
 * @typedef {object} InfoSession -Profil de l'utilisateur
 * @property {string} nomUtilisateur -Nom de l'utilisateur
 * @property {string} prenomUtilisateur -Prenom de l'utilisateur
 * @property {string} numeroUtilisateur -Numéro de l'utilisateur
 * @property {string} typeUtilisateur -Le type d'utilisateur qu'il est
 * @property {string} nomAssurance -Le nom de l'assurance de l'utilisateur
 * @property {string} adresseUtilisateur -Adresse de l'utilisateur
 * @property {string} ville_utilisateur - Ville de résidence de l'utilisateur
 * @property {string} jeton_jwt -Jeton JWT pour la sécurisation des requetes
 */
/**
 * POST /api/utilisateur/profilutilisateur
 * @summary Profil utilisateur
 * @tags Utilisateur
 * @param {string} code_utilisateur.required - Code de l'utilisateur dont on veut le profil
 * @return {InfoSession} 201 - Profil utilisateur obtenu avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Profil utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 *
 */
routes.post("/profilutilisateur", (req, res) => {
  return controllerUtilisateur.profilUtilisateur(req, res);
});
//Envoyer la position
/**
 * PUT /api/utilisateur/enovyerLocalisation
 * @summary Envoyer position utilisateur
 * @tags Utilisateur
 * @param {string} code_utilisateur.path.required - Code de l'utilisateur qui envoi sa position
 * @param {number} latitude.path.required - Latitude de la position
 * @param {number} longitude.path.required  - Longitude de la position
 * @return {object} 200 - Position envoyé avec succès
 * @return {object} 400 - Impossible d'envoyer la position
 * @return {object} 500 - Erreur server
 */
routes.put("/enovyerLocalisation", (req, res) => {
  return controllerUtilisateur.envoyerLocalisation(req, res);
});
//Récupérer mot de passe
/**
 * POST /api/utilisateur/recoverpassword
 * @summary Récupérer le mot passe
 * @tags Utilisateur
 * @param {string} numeros_utilisateur.required -Numéro envoyer pour vérifier qui récupère le mot de passe
 * @return {object} 201 - Numéros vérifié avec succès
 * @return {object} 400 - Données invalides
 * @return {object} 409 - Utilisateur introuvable
 * @return {object} 500 - Erreur serveur
 */
routes.post("/recoverPassword", (req, res) => {
  return res.json({
    success: true,
    message: "Numéro vérifier avec succès",
  });
});

//ajouter assurances de l'utilisateur
/**
 * POST /api/utilisateur/recoverpassword
 * @summary Récupérer le mot passe
 * @tags Utilisateur
 * @param {string} codeUtilisateur.required - Code de l'utilisateur dont on ajoute la liste d'assurance
 * @param {Array[]} liste_assurance.required - Liste des assurances qu'on veut ajouter à la liste d'assurance de l'utilisateur
 * @return {object} 201 - Assurance ajouté avec succès
 * @return {object} 400 - Impossible d'ajouter les assurances
 * @return {object} 500 - Erreur serveur
 */
routes.post("/ajouterAssurance", (req, res) => {
  return res.json({
    success: true,
    message: "Numéro vérifier avec succès",
  });
});

//Enovyer FCM_Token
/**
 * PUT /api/utilisateur/envoyerFCMT
 * @summary Envoyer le FCM token pour les notifications push
 * @tags Utilisateur
 * @param {string} fcm_token.request.required - Le FCM Token de l'utilisateur
 * @param {string} code_utilisateur.request.required - Code de l'utilisateur dont on veut mettre à jour le FCM token
 * @return {object} 201 - FCM Token envoyé avec succès
 * @return {object} 400 - Impossible de trouver l'utilisateur
 * @return {object} 500 - Erreur Serveur
 */
routes.put("/envoyerFCMT", (req, res) => {
  return controllerUtilisateur.envoyerFCMToken(req, res);
});
module.exports = routes;
