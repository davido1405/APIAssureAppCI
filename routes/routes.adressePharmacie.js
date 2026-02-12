const express = require("express");
const routes = express.Router();

const controlleradressePharmacie = require("../controllers/controller.adressePharmacies");

//Ajouter une adresse à une pharmacie
/**
 * @typedef {object} adressepharmacie
 * @property {number} latitude -Latitude de la position de la phamacie
 * @property {number} longitude -Longitude de la position de la pharmacie
 * @property {string} adresseFourni.required -Adresse frouni lors de l'ajout de la pharmacie
 */
/**
 * POST /api/adressepharmacie/ajouteradresse
 * @summary Ajouter une adresse pharmacie
 * @tags Adresse pharmacie
 * @param {string} request.body.required -Code de la pharmacie pour associer adresse et pharmacie
 * @param {adressepharmacie} request.body.required - Information sur l'adresse
 * @return {object} 201 - Adresse ajoutée avec succès
 * @return {object} 409 - Impossible d'ajouter l'adresse
 * @return {object} 500 - Erreur server
 */
routes.post("/ajouteradresse", (req, res) => {
  return controlleradressePharmacie.ajouterAdresse(req, res);
});

//Mettre à jour adresse
/**
 * @typedef {object} adressepharmacie
 * @property {number} latitude -Latitude de la position de la phamacie
 * @property {number} longitude -Longitude de la position de la pharmacie
 * @property {string} adresseFourni.required -Adresse frouni lors de l'ajout de la pharmacie
 */
/**
 * PUT /api/adressepharmacie/modifieradresse
 * @summary Mettre à jour une adresse de pharmacie
 * @tags Adresse pharmacie
 * @param {string} request.body.required -Code de la pharmacie pour associer adresse et pharmacie
 * @param {adressepharmacie} request.body.required - Information sur l'adresse
 * @return {object} 201 - Adresse mise à jour avec succès
 * @return {object} 409 - Impossible de mettre à jour l'adresse
 * @return {object} 500 - Erreur server
 */
routes.put("/modifieradresse", (req, res) => {
  return controlleradressePharmacie.modifierAdresse(req, res);
});
module.exports = routes;
