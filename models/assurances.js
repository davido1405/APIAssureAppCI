const dataBase = require("../config/db_config.js");

const express = require("express");
const logger = require("../logger.js");

class assurance {
  //Lister toutes les assurances du système
  static async listeAssurance() {
    logger.debug(`Récupération de la liste des assurances...`);
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(`Exécution de la requette..`);
      const requete = await connexion.query(
        "SELECT * FROM assurances WHERE id_statut=1",
      );
      const assurances = requete[0];

      logger.debug(`Liste des assurances récupérée avec succès !`);
      return {
        success: true,
        message: "Liste des assurances du système",
        data: assurances.length != 0 ? assurances : [],
      };
    } catch (error) {
      logger.debug(
        `Erreur lors de la récupération de la liste des assurances erreur: ${error.message}`,
      );
      console.log(error);
      connexion.release();
      return {
        success: false,
        message: "Impossible de charger la liste des assurances du système",
      };
    } finally {
      connexion.release();
    }
  }
  //Ajouter une nouvelle assurance au système
  static async ajouterAssurance(nomAssurance) {
    logger.debug(`Ajout d'une nouvelle assurance...`);
    if (!nomAssurance) {
      logger.debug(`Tentative d'ajout d'une assurance sans nom d'assurance`);
      return { success: false, message: "Veuillez saisir un nom d'assurance" };
    }
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(
        `Vérifier que l'assurance ${nomAssurance} n'est pas déjà en BD`,
      );
      //Vérifie l'unicité de l'assurance à ajouter
      const requete1 = await connexion.query(
        "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
        [nomAssurance],
      );
      const existance = requete1[0][0];

      if (existance) {
        logger.debug(`L'assurance existe déjà en BD`);
        return {
          success: false,
          message: "Cette assurance existe déjà dans la BD",
        };
      }
      logger.debug(`Ajout de l'assurance ${nomAssurance}...`);
      const requete = await connexion.query(
        "INSERT INTO assurances(nom_assurance) VALUES(?)",
        [nomAssurance],
      );
      logger.debug(`Assurance ${nomAssurance} ajoutée avec succès !`);
      return {
        success: true,
        message: "Assurance ajouté avec succès au système",
      };
    } catch (error) {
      connexion.release();
      logger.error(
        `Erreur lors de l'ajout de l'assurance... nom_assurance: ${nomAssurance} erreur: ${error.message}`,
      );
      console.log(error);
      return {
        success: false,
        message: "Impossible d'ajouter cette assurance au système",
      };
    } finally {
      connexion.release();
    }
  }
  //Mettre à jour les informations assurance
  static async modifierAssurance(id_assurance, nouvelle_valeur) {
    logger.debug(`Modification d'une assurance...`);
    if (!(id_assurance && nouvelle_valeur)) {
      logger.debug(
        `Tentative de modification d'une assurance sans id_assurance et nouvelle_valeur de l'assurance`,
      );
      return {
        success: false,
        message: "Veuillez vérifier toutes les informations",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      logger.debug(
        `Mise à jour de l'assurance id_assurance: ${id_assurance} nouvelle_valeur: ${nouvelle_valeur}`,
      );
      const requete = await connexion.query(
        "UPDATE assurances SET nom_assurance=? WHERE id_assurance=?",
        [nouvelle_valeur, id_assurance],
      );
      logger.debug(`Assurance modifié avec succès`);

      return {
        success: true,
        message: "Informations assurance mise à jour avec succès!",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la modification de l'assurance id_assurance: ${id_assurance} erreur: ${error.message}`,
      );
      connexion.release();
      console.log(error);
      return {
        success: false,
        message: "Impossible de mettre à jour les informations de l'assurance",
      };
    } finally {
      connexion.release();
    }
  }

  //désactiver une assurance du système
  static async desactiverAssurance(id_assurance) {
    logger.debug(`Désactivation d'une assurance...`);
    if (!id_assurance) {
      logger.debug(
        `Tentative de désactivation d'une assurance sans id_assurance`,
      );
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      logger.debug(
        `Exécution de la requette de désactivation... id_assurance: ${id_assurance}`,
      );
      const requete = await connexion.query(
        "UPDATE assurances SET id_statut=? WHERE id_assurance=?",
        [2, id_assurance],
      );
      logger.debug(`Assurance désactivé avec succès !`);

      return {
        success: true,
        message: "Assurance désactivée avec succès !",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la désactivation de l'assurance erreur: ${error.message}`,
      );
      console.log(error);

      return {
        success: false,
        message: "Impossible de désactiver cette assurance",
      };
    } finally {
      connexion.release();
    }
  }

  //activer une assurance du système
  static async activerAssurance(id_assurance) {
    logger.debug(`Activation d'une assurance...`);
    if (!id_assurance) {
      logger.debug(
        `Tentative d'activation d'une assurance sans id_assurance: ${id_assurance}`,
      );
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      logger.debug(`Désactivation de l'assurance`);
      const requete = await connexion.query(
        "UPDATE assurances SET id_statut=? WHERE id_assurance=?",
        [1, id_assurance],
      );
      logger.debug(`Assurance désactivée`);

      return {
        success: true,
        message: "Assurance activée avec succès !",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la désactivation de l'assurance erreur: ${error.message}`,
      );
      connexion.release();
      console.log(error);

      return {
        success: false,
        message: "Impossible d'activer cette assurance",
      };
    } finally {
      connexion.release();
    }
  }
}
module.exports = assurance;
