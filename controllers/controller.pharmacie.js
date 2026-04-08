const express = require("express");

const modelPharmacie = require("../models/pharmacie");

const ImageManagement = require("../services/UploadImages");
const e = require("express");
const logger = require("../logger");
const { error } = require("winston");

class controllerPharmacie {
  //Récupérer le profile de la pharmacie
  static async profilPharmacie(req, res) {
    try {
      const { code_gerant } = req.body;
      const reponse = await modelPharmacie.profilPharmacie(code_gerant);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => profilPharmacie erreur: ${error.message}`,
      );
    }
  }
  //Ajouter une assurance à la liste d'assurance acceptée
  static async ajouterAssurance(req, res) {
    try {
      const { codePharmacie, liste_assurance } = req.body;
      const reponse = await modelPharmacie.ajouterAssurance(
        codePharmacie,
        liste_assurance,
      );
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => ajouterAssurance erreur: ${error.message}`,
      );
    }
  }
  //Rechercher une pharmacie
  static async rechercherPharmacie(req, res) {
    try {
      const { terme_saisi, longitude, latitude } = req.query;
      const reponse = await modelPharmacie.rechercherPharmacie(
        terme_saisi,
        longitude,
        latitude,
      );
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => rechercherPharmacie erreur: ${error.message}`,
      );
    }
  }
  //Récupérer toutes les pharmacies
  static async toutePharmacies(req, res) {
    try {
      const { limits } = req.params;
      const reponse = await modelPharmacie.toutePharmacies(limits);
      return res.json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => toutePharmacie erreur: ${error.message}`,
      );
    }
  }

  //Ajouter une pharmacie
  static async ajouterPharmacie(req, res) {
    try {
      console.log("=== DONNÉES REÇUES ===");
      console.log("Body:", req.body);
      console.log("File:", req.file);

      logger.info(
        `Ajout d'une nouvelle pharmacie... => pharmacie: ${nom_pharmacie} date: ${new Date().toISOString} origine: ${req.hostname}`,
      );

      const {
        code_gerant,
        nom_pharmacie,
        numero_pharmacie,
        email_pharmacie,
        ville_pharmacie,
        adresse_fournit,
        horaires_en_semaine,
        horaires_samedi,
        horaires_dimanche,
        horraires_ouverture,
        latitudePharmacie,
        longitudePharmacie,
        liste_assurance_accepte,
      } = req.body;

      // ✅ Validation AVANT upload
      if (
        !code_gerant ||
        !nom_pharmacie ||
        !numero_pharmacie ||
        !email_pharmacie ||
        !ville_pharmacie ||
        !adresse_fournit ||
        !horaires_en_semaine ||
        !horaires_samedi ||
        !horaires_dimanche
      ) {
        logger.info(
          `Tentative d'ajout d'une pharmacie avec des informations manquante => Origine: ${req.hostname}`,
        );
        return res.status(400).json({
          success: false,
          message: "Tous les champs requis doivent être remplis",
        });
      }

      // ✅ Parser les assurances
      let assurances = [];
      try {
        assurances = JSON.parse(liste_assurance_accepte);
        console.log("✅ Assurances parsées:", assurances);
      } catch (e) {
        console.error("❌ Erreur parsing assurances:", e);
        return res.status(400).json({
          success: false,
          message: "Format des assurances invalide",
        });
      }

      // ✅ Upload vers Cloudinary
      let photo_pharmacie = null;

      if (req.file && req.file.buffer) {
        logger.info(
          `Uploading photo de pharmacie vers cloudinary... => pharmacie: ${nom_pharmacie}`,
        );
        try {
          const fileName = `PHARM-${Date.now()}-${code_gerant}`;
          console.log("📤 Upload vers Cloudinary...");

          const uploadResult = await ImageManagement.uploadFromBuffer(
            req.file.buffer,
            fileName,
          );

          photo_pharmacie = uploadResult.secure_url;
          logger.info(
            `Photo uploadé avec succès => pharmacie: ${nom_pharmacie} nom_fichier: ${fileName}`,
          );
        } catch (uploadError) {
          logger.warn(
            `Echec uploading photo => pharmacie: ${nom_pharmacie} cause: ${uploadError.message}`,
          );
          console.error("❌ Erreur upload Cloudinary:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Erreur lors de l'upload de la photo",
            error: uploadError.message,
          });
        }
      } else {
        console.log("⚠️ Aucune photo fournie ou buffer manquant");
      }

      // ✅ Vérifier que la photo est présente
      if (!photo_pharmacie) {
        logger.info(
          `Tentative d'enregistrement d'une nouvelle pharmacie sans photo => pharmacie: ${nom_pharmacie} origine:${req.hostname}`,
        );
        return res.status(400).json({
          success: false,
          message: "La photo de la pharmacie est requise",
        });
      }

      // ✅ Parser les coordonnées GPS (accepter 0 comme valeur valide)
      const latitude = parseFloat(latitudePharmacie);
      const longitude = parseFloat(longitudePharmacie);

      // Vérifier que le parsing a fonctionné
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: "Coordonnées GPS invalides",
        });
      }

      console.log("=== COORDONNÉES ===");
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);

      console.log("=== AVANT APPEL MODÈLE ===");
      console.log("photo_pharmacie:", photo_pharmacie);
      console.log("latitude:", latitude);
      console.log("longitude:", longitude);

      // ✅ Appeler le modèle
      console.log("=== APPEL MODÈLE ===");
      const reponse = await modelPharmacie.ajouterPharmacie(
        code_gerant,
        nom_pharmacie,
        photo_pharmacie,
        numero_pharmacie,
        horraires_ouverture,
        latitude, // ✅ Nombre (peut être 0)
        longitude, // ✅ Nombre (peut être 0)
        ville_pharmacie,
        adresse_fournit,
        email_pharmacie,
        assurances,
      );

      console.log("=== RÉPONSE MODÈLE ===");
      console.log(reponse);

      return res.status(reponse.success ? 201 : 400).json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => ajouterPharmacie erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message,
      });
    }
  }

  //Mettre à jour infos pharmacie

  static async modifierPharmacie(req, res) {
    try {
      console.log("=== MODIFICATION PHARMACIE ===");
      console.log("Body:", req.body);
      console.log("File:", req.file);

      const {
        code_pharmacie,
        nom_pharmacie,
        numero_pharmacie,
        email_pharmacie,
        ville_pharmacie,
        adresse_fournit,
        horaires_en_semaine,
        horaires_samedi,
        horaires_dimanche,
        latitudePharmacie,
        longitudePharmacie,
        liste_assurance_accepte,
      } = req.body;

      // ✅ Validation du code pharmacie (obligatoire)
      if (!code_pharmacie) {
        logger.info(`Code pharmacie manquant: ${req.hostname}`);
        return res.status(400).json({
          success: false,
          message: "Code pharmacie manquant",
        });
      }

      // ✅ Parser les assurances si présentes
      let assurances = null;
      if (liste_assurance_accepte) {
        logger.info(
          `Pas de nouvelle(s) assurance(s) acceptée(s) => pharmacie: ${nom_pharmacie} origin: ${req.hostname}`,
        );
        try {
          assurances = JSON.parse(liste_assurance_accepte);
          console.log("✅ Assurances parsées:", assurances);
        } catch (e) {
          console.error("❌ Erreur parsing assurances:", e);
          return res.status(400).json({
            success: false,
            message: "Format des assurances invalide",
          });
        }
      }

      // ✅ Upload photo si présente
      let photo_pharmacie = null;

      if (req.file && req.file.buffer) {
        try {
          const fileName = `PHARM-${Date.now()}-${code_pharmacie}`;
          console.log("📤 Upload vers Cloudinary...");

          const uploadResult = await ImageManagement.uploadFromBuffer(
            req.file.buffer,
            fileName,
          );

          photo_pharmacie = uploadResult.secure_url;
          console.log("✅ Photo uploadée:", photo_pharmacie);
        } catch (uploadError) {
          console.error("❌ Erreur upload Cloudinary:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Erreur lors de l'upload de la photo",
            error: uploadError.message,
          });
        }
      } else {
        console.log("⚠️ Aucune nouvelle photo fournie");
      }

      // ✅ Parser les coordonnées GPS (optionnelles)
      const latitude =
        latitudePharmacie !== undefined
          ? parseFloat(latitudePharmacie)
          : undefined;

      const longitude =
        longitudePharmacie !== undefined
          ? parseFloat(longitudePharmacie)
          : undefined;

      console.log("=== COORDONNÉES ===");
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);

      console.log("=== AVANT APPEL MODÈLE ===");

      const debut = new Date();
      logger.info(
        `Mise à jour profile... => pharmacie: ${req.code_pharmacie} date: ${new Date().toISOString}`,
      );
      // ✅ Appeler le modèle
      const reponse = await modelPharmacie.modifierPharmacie(
        code_pharmacie,
        nom_pharmacie,
        photo_pharmacie, // Peut être null
        numero_pharmacie,
        horaires_en_semaine,
        horaires_samedi,
        horaires_dimanche,
        latitude, // Peut être undefined
        longitude, // Peut être undefined
        ville_pharmacie,
        adresse_fournit,
        email_pharmacie,
        assurances, // Peut être null
      );

      console.log("=== RÉPONSE MODÈLE ===");
      console.log(reponse);

      const duree = new Date.now() - debut;

      if (reponse.success) {
        logger.info(
          `Profil pharmacie mis à jour avec succès =>pharmacie: ${req.code_pharmacie} temps_execution=${duree}`,
        );
      } else {
        logger.info(
          `Impossible de mettre à jour le profil de la pharmacie =>pharmacie: ${req.code_pharmacie} temps_execution=${duree}`,
        );
      }
      return res.status(reponse.success ? 200 : 400).json(reponse);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => modifierPharmacie erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message,
      });
    }
  }

  //Récupérer les statistiques d'une pharmacie
  static async recupererStatistiques(req, res) {
    try {
      // ✅ VÉRIFICATION CRITIQUE
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log("❌ req.body est vide ou undefined");
        console.log("Content-Type:", req.headers["content-type"]);

        return res.status(400).json({
          success: false,
          message: "Aucune donnée reçue. Vérifiez le Content-Type.",
        });
      }

      const { code_pharmacie } = req.params;
      if (!code_pharmacie) {
        return res.status(400).json({
          success: false,
          message: "Code pharmacie manquant",
        });
      }

      const reponse =
        await modelPharmacie.recupererStatistiques(code_pharmacie);

      if (reponse) {
        return res.status(200).json({
          success: true,
          message: "Statistique récupérées avec succès!",
          data: reponse,
        });
      } else {
        console.log("⚠️ Aucune statistique trouvée");
        return res.status(400).json({
          success: false,
          message: "Aucune statistique trouvée pour cette pharamcie",
        });
      }
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => recupererStatistiques erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Une erreur s'est produite côté serveur",
        error: error.message,
      });
    }
  }

  //Modifier statut de garde

  static async mettreAJourStatutGarde(req, res) {
    try {
      const { code_pharmacie, est_de_garde } = req.body;

      console.log("=== CONTROLLER: STATUT GARDE ===");
      console.log("Body:", req.body);

      // ✅ Validation
      if (!code_pharmacie) {
        return res.status(400).json({
          success: false,
          message: "Code pharmacie requis",
        });
      }

      if (typeof est_de_garde !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "est_de_garde doit être un boolean",
        });
      }

      // ✅ Appeler le modèle
      const resultat = await modelPharmacie.mettreAJourStatutGarde(
        code_pharmacie,
        est_de_garde,
      );

      console.log("Résultat modèle:", resultat);

      // ✅ IMPORTANT : Retourner la réponse au client
      const statusCode = resultat.success ? 200 : 400;
      return res.status(statusCode).json(resultat);
    } catch (error) {
      logger.error(
        `Erreur controller.pharmacie => mettreAJourStatutGarde erreur: ${error.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}
module.exports = controllerPharmacie;
