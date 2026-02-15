const dataBase = require("../config/db_config.js");

const express = require("express");

class assurance {
  //Lister toutes les assurances du système
  static async listeAssurance() {
    const connexion = await dataBase.getConnection();

    try {
      const requete = await connexion.query(
        "SELECT * FROM assurances WHERE id_satut=1",
      );
      const assurances = requete[0];

      return {
        success: true,
        message: "Liste des assurances du système",
        data: assurances.length != 0 ? assurances : [],
      };
    } catch (error) {
      console.log(error);
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
    if (!nomAssurance) {
      return { success: false, message: "Veuillez saisir un nom d'assurance" };
    }
    const connexion = await dataBase.getConnection();

    try {
      //Vérifie l'unicité de l'assurance à ajouter
      const requete1 = await connexion.query(
        "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
        [nomAssurance],
      );
      const existance = requete1[0][0];

      if (existance) {
        return {
          success: false,
          message: "Cette assurance existe déjà dans la BD",
        };
      }
      const requete = await connexion.query(
        "INSERT INTO assurances(nom_assurance) VALUES(?)",
        [nomAssurance],
      );
      return {
        success: true,
        message: "Assurance ajouté avec succès au système",
      };
    } catch (error) {
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
    if (!(id_assurance && nouvelle_valeur)) {
      return {
        success: false,
        message: "Veuillez vérifier toutes les informations",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "UPDATE assurances SET nom_assurance=? WHERE id_assurance=?",
        [nouvelle_valeur, id_assurance],
      );

      return {
        success: true,
        message: "Informations assurance mise à jour avec succès!",
      };
    } catch (error) {
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
    if (!id_assurance) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "UPDATE assurances SET id_statut=? WHERE id_assurance=?",
        [2, id_assurance],
      );

      return {
        success: true,
        message: "Assurance désactivée avec succès !",
      };
    } catch (error) {
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
    if (!id_assurance) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "UPDATE assurances SET id_statut=? WHERE id_assurance=?",
        [1, id_assurance],
      );

      return {
        success: true,
        message: "Assurance activée avec succès !",
      };
    } catch (error) {
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
