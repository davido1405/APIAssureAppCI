const express = require("express");

const modelPharmacie = require("../models/pharmacie");

const ImageManagement = require("../services/UploadImages");
const e = require("express");

class controllerPharmacie {
  //Récupérer le profile de la pharmacie
  static async profilPharmacie(req, res) {
    const { code_gerant } = req.body;
    const reponse = await modelPharmacie.profilPharmacie(code_gerant);
    return res.json(reponse);
  }
  //Ajouter une assurance à la liste d'assurance acceptée
  static async ajouterAssurance(req, res) {
    const { codePharmacie, liste_assurance } = req.body;
    const reponse = await modelPharmacie.ajouterAssurance(
      codePharmacie,
      liste_assurance,
    );
    return res.json(reponse);
  }
  //Rechercher une pharmacie
  static async rechercherPharmacie(req, res) {
    const { terme_saisi, longitude, latitude } = req.query;
    const reponse = await modelPharmacie.rechercherPharmacie(
      terme_saisi,
      longitude,
      latitude,
    );
    return res.json(reponse);
  }
  //Récupérer toutes les pharmacies
  static async toutePharmacies(req, res) {
    const { limits } = req.params;
    const reponse = await modelPharmacie.toutePharmacies(limits);
    return res.json(reponse);
  }

  //Ajouter une pharmacie
  static async ajouterPharmacie(req, res) {
    try {
      console.log("=== DONNÉES REÇUES ===");
      console.log("Body:", req.body);
      console.log("File:", req.file);

      const {
        code_gerant,
        nom_pharmacie,
        numero_pharmacie,
        email_pharmacie,
        ville_pharmacie,
        adresse_fournit,
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
        !horraires_ouverture
      ) {
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
        try {
          const fileName = `PHARM-${Date.now()}-${code_gerant}`;
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
        console.log("⚠️ Aucune photo fournie ou buffer manquant");
      }

      // ✅ Vérifier que la photo est présente
      if (!photo_pharmacie) {
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
      console.error("❌ Erreur ajouterPharmacie:", error);
      console.error("Stack:", error.stack);
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
        horraires_ouverture,
        latitudePharmacie,
        longitudePharmacie,
        liste_assurance_accepte,
      } = req.body;

      // ✅ Validation du code pharmacie (obligatoire)
      if (!code_pharmacie) {
        return res.status(400).json({
          success: false,
          message: "Code pharmacie manquant",
        });
      }

      // ✅ Parser les assurances si présentes
      let assurances = null;
      if (liste_assurance_accepte) {
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

      // ✅ Appeler le modèle
      const reponse = await modelPharmacie.modifierPharmacie(
        code_pharmacie,
        nom_pharmacie,
        photo_pharmacie, // Peut être null
        numero_pharmacie,
        horraires_ouverture,
        latitude, // Peut être undefined
        longitude, // Peut être undefined
        ville_pharmacie,
        adresse_fournit,
        email_pharmacie,
        assurances, // Peut être null
      );

      console.log("=== RÉPONSE MODÈLE ===");
      console.log(reponse);

      return res.status(reponse.success ? 200 : 400).json(reponse);
    } catch (error) {
      console.error("❌ Erreur modifierPharmacie:", error);
      console.error("Stack:", error.stack);
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
      console.log("Erreur recupererStatistiques:", error);
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

      // Validation
      if (!code_pharmacie || est_de_garde === undefined) {
        return res.status(400).json({
          success: false,
          message: "Code pharmacie et statut de garde requis",
        });
      }

      // Convertir en booléen
      const statut = est_de_garde === "DE GARDE" ? 1 : 0;

      // ✅ Appel simple au modèle
      const resultat = await modelPharmacie.mettreAJourStatutGarde(
        code_pharmacie,
        statut,
      );

      return res.status(resultat.success ? 200 : 400).json(resultat);
    } catch (error) {
      console.error("❌ Erreur controller:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
}
module.exports = controllerPharmacie;
