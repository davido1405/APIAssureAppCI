const dataBase = require("../config/db_config.js");
const logger = require("../logger.js");
const jwt = require("../config/jwt_manager.js");
const { log } = require("winston");
const { messaging } = require("firebase-admin");
class utilisateur {
  static randomAlphaNum(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  //Générer un code utilisateur
  static genererCodeUtilisateur() {
    let prefix = "USER";
    let dateInscription = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    let partieAlea = this.randomAlphaNum(5);

    let code_utilisateur = prefix + "-" + dateInscription + "-" + partieAlea;
    return code_utilisateur;
  }
  //Inscription
  static async inscription(
    nomUtilisateur,
    prenomUtilisateur,
    numeroUtilisateur,
    codePinUtilisateur,
    type_utilisateur,
    assuranceUtilisateur,
    ville_utilisateur,
    adresseUtilisateur,
  ) {
    const connexion = await dataBase.getConnection();
    logger.info(`Inscription utilisateur...`);
    await connexion.beginTransaction();
    try {
      logger.debug("Vérification de l'unicité du numéro d'utilisateur");
      //Vérifier qu'il n'y a pas déjà un compte avec ce numéro
      const requ1 = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE numeros_utilisateur =?",
        [numeroUtilisateur],
      );
      const existe = requ1[0][0];
      if (existe) {
        logger.info(
          `Un compte existe déjà pour ce numéro. numéro: ${numeroUtilisateur}`,
        );
        await connexion.rollback();
        return {
          success: false,
          message: "Un compte existe déjà pour ce numéro.",
        };
      }
      logger.debug("Récupérer le type utilisateur");
      //Récupérer l'id_type_utilisateur
      const requ = await connexion.query(
        "SELECT id_type_utilisateur FROM type_utilisateur WHERE libelle_type_utilisateur=?",
        [type_utilisateur],
      );
      const type = requ[0][0]?.id_type_utilisateur;
      if (!type) {
        logger.info(
          `Type utilisateur non définie. type_utilisateur: ${type_utilisateur}`,
        );
        await connexion.rollback();
        return {
          success: false,
          message: "Type utilisateur non défini",
        };
      }

      logger.debug(
        `Récupération de l'id_assurance... assurance: ${assuranceUtilisateur}`,
      );
      //Récupérer l'id_assurance
      const requ2 = await connexion.query(
        "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
        [assuranceUtilisateur],
      );
      let idAssurance = requ2[0][0]?.id_assurance || null;

      if (!idAssurance) {
        logger.debug(`Assurance inexistance donc ajouté!`);
        const ajout = await connexion.query(
          "INSERT INTO assurances (nom_assurance) VALUES(?)",
          [assuranceUtilisateur],
        );
        idAssurance = ajout[0].insertId;
      }
      const code_utilisateur = this.genererCodeUtilisateur();

      logger.debug("Insertion utilisateur dans la table utilisateur...");
      //Créer l'utilisateur
      const rows = await connexion.query(
        "INSERT INTO utilisateurs (code_utilisateur,nom_utilisateur,prenom_utilisateur,numeros_utilisateur,password_hash,id_type_utilisateur,id_assurance) VALUES (?,?,?,?,?,?,?)",
        [
          code_utilisateur,
          nomUtilisateur,
          prenomUtilisateur,
          numeroUtilisateur,
          codePinUtilisateur,
          type,
          idAssurance,
        ],
      );

      logger.debug("Récupération de l'id_ville de l'utilisateur");
      //Récupérer l'id_ville avant
      const [verifVille] = await connexion.query(
        "SELECT id_ville FROM villes where nom_ville=?",
        [ville_utilisateur],
      );
      let id_ville;
      if (verifVille.length > 0) {
        id_ville = verifVille[0].id_ville;
        logger.debug("Id récupérée");
      } else {
        logger.debug("Ajout ville...");
        const [ajouterVille] = await connexion.query(
          "INSERT INTO villes(nom_ville)VALUES(?)",
          [ville_utilisateur],
        );
        id_ville = ajouterVille.insertId;
        logger.debug("Ville ajouté");
      }

      logger.debug("Ajout de l'adresse utilisateur...");
      //Inserer dans adresse utilisateur
      const rows2 = await connexion.query(
        "INSERT INTO adresse_utilisateur (code_utilisateur,adresse_fournit,id_ville) VALUES(?,?,?)",
        [code_utilisateur, adresseUtilisateur, id_ville],
      );

      logger.debug("Adresse ajoutée");
      //Mettre maintenant l'adresse à jour
      const rows3 = await connexion.query(
        "UPDATE utilisateurs SET id_adresse=? WHERE code_utilisateur=?",
        [rows2[0].insertId, code_utilisateur],
      );

      logger.debug("Création de la liaison utilisateur-adress_utilisateur");
      await connexion.commit();

      logger.debug("Génération du JWT...");
      //Juste pour les tests
      const jwt_tokens = jwt.generateurJWT(
        code_utilisateur,
        type_utilisateur,
        numeroUtilisateur,
      );

      if (jwt_tokens) {
        logger.debug("JWT généré avec succes!");
      } else {
        logger.debug("Erreur génération du JWT");
        return {
          success: false,
          message:
            "Inscription impossible pour le moment. Veuillez réessayer plus tard",
        };
      }

      return {
        success: true,
        message: "Inscription effectuée avec succès !",
        data: {
          code_utilisateur: code_utilisateur,
          nom_utilisateur: nomUtilisateur,
          prenom_utilisateur: prenomUtilisateur,
          numeros_utilisateur: numeroUtilisateur,
          type_utilisateur: type_utilisateur,
          assurance_utilisateur: assuranceUtilisateur,
          adresse_utilisateur: adresseUtilisateur,
          ville_utilisateur: ville_utilisateur,
          jwt_tokens: jwt_tokens,
        },
      };
    } catch (error) {
      await connexion.rollback();
      logger.error(`Erreur lors de l'inscription => erreur: ${error.message}`);
      console.error(error);
      return {
        success: false,
        message: "Inscription de l'utilisateur impossible",
      };
    } finally {
      connexion.release();
    }
  }

  //Connexion
  static async connexion(numeroUtilisateur, codePinUtilisateur) {
    if (!(numeroUtilisateur && codePinUtilisateur)) {
      logger.info(`Tentative de connexion avec champ manquant`);
      return {
        success: false,
        message: "Veuillez vérifier tous les champs. Merci",
      };
    }

    //Initialisation connexion BD
    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "SELECT u.code_utilisateur,u.nom_utilisateur,u.prenom_utilisateur,u.numeros_utilisateur,u.password_hash,u.fcm_tokens,t.libelle_type_utilisateur,a.nom_assurance,ad.adresse_fournit,v.nom_ville as ville_utilisateur FROM utilisateurs as u INNER JOIN type_utilisateur as t ON t.id_type_utilisateur=u.id_type_utilisateur LEFT JOIN assurances as a ON a.id_assurance=u.id_assurance LEFT JOIN adresse_utilisateur as ad ON ad.id_adresse=u.id_adresse INNER JOIN villes as v ON v.id_ville=ad.id_ville WHERE numeros_utilisateur=?",
        [numeroUtilisateur],
      );
      const utilisateur = requete[0][0];
      if (!utilisateur) {
        logger.info(
          `Aucun utilisateur n'existe pour ce numéro: ${numeroUtilisateur}`,
        );
        return {
          success: false,
          message:
            "Aucun compte n'existe pour ce numéro. Veuillez vous inscrire ! Merci",
        };
      }
      if (utilisateur.password_hash != codePinUtilisateur) {
        logger.info(
          `Code pin erroné lors de la connexion => numéro: ${numeroUtilisateur}`,
        );
        return {
          success: false,
          message: "Veuillez vérifier votre mot de passe. Merci",
        };
      }

      logger.info(`Génération du JWT... => utilisateur: ${numeroUtilisateur}`);

      let messageLog;
      //Juste pour les tests
      const jwt_tokens = jwt.generateurJWT(
        utilisateur.code_utilisateur,
        utilisateur.type_utilisateur,
        utilisateur.numeros_utilisateur,
      );

      if (jwt_tokens) {
        logger.info(
          `JWT généré avec succes pour utilisateur: ${numeroUtilisateur}`,
        );
      } else {
        logger.info(
          `Echec génération JWT pour utilisateur: ${numeroUtilisateur}`,
        );
        return {
          success: false,
          message: "Une erreur s'est produite veuillez réessayer plus tard",
        };
      }

      logger.info(`Connexion reussi => utilisateur: ${numeroUtilisateur}`);

      connexion.release();
      return {
        success: true,
        message: "Utilisateur authentifié avec succès !",
        data: {
          code_utilisateur: utilisateur.code_utilisateur,
          nom_utilisateur: utilisateur.nom_utilisateur,
          prenom_utilisateur: utilisateur.prenom_utilisateur,
          numeros_utilisateur: utilisateur.numeros_utilisateur,
          type_utilisateur: utilisateur.libelle_type_utilisateur,
          assurance_utilisateur: utilisateur.nom_assurance,
          adresse_utilisateur: utilisateur.adresse_fournit,
          ville_utilisateur: utilisateur.ville_utilisateur,
          jwt_tokens: jwt_tokens,
        },
      };
    } catch (error) {
      logger.error(
        `Echec de connexion => uilisateur: ${numeroUtilisateur} erreur: ${error.message}`,
      );
      connexion.release();
      return {
        success: false,
        message: "Une erreur s'est produite. Veuillez réessayer",
      };
    } finally {
      connexion.release();
    }
  }

  //Récupérer le profil
  static async profilUtilisateur(code_utilisateur) {
    if (!code_utilisateur) {
      logger.info(`Tentative de récupération de profil sans code_utilisateur`);
      return {
        success: false,
        message: "Veuillez vérifier tous les champs. Merci",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      logger.info(
        `Récupération du profil... =>utilisateur: ${code_utilisateur}`,
      );
      const requete = await connexion.query(
        "SELECT u.code_utilisateur,u.nom_utilisateur,u.prenom_utilisateur,u.numeros_utilisateur,u.fcm_tokens,t.libelle_type_utilisateur,a.nom_assurance,ad.adresse_fournit,v.nom_ville as ville_utilisateur FROM utilisateurs as u INNER JOIN type_utilisateur as t ON t.id_type_utilisateur=u.id_type_utilisateur LEFT JOIN assurances as a ON a.id_assurance=u.id_assurance LEFT JOIN adresse_utilisateur as ad ON ad.id_adresse=u.id_adresse LEFT JOIN villes as v ON v.id_ville=ad.id_ville WHERE u.code_utilisateur=?",
        [code_utilisateur],
      );
      const utilisateur = requete[0][0];

      if (!utilisateur) {
        logger.info(
          `Aucun profil trouvé pour utilisateur: ${code_utilisateur}`,
        );
        return {
          success: false,
          message: "Aucun profil trouvé pour cet utilisateur",
        };
      }

      //Juste pour les tests
      const jwt_tokens = jwt.generateurJWT(
        utilisateur.code_utilisateur,
        utilisateur.libelle_type_utilisateur,
        utilisateur.numeros_utilisateur,
      );

      return {
        success: true,
        message: "Profil utilisateur récupéré avec succès !",
        data: {
          code_utilisateur: utilisateur.code_utilisateur,
          nom_utilisateur: utilisateur.nom_utilisateur,
          prenom_utilisateur: utilisateur.prenom_utilisateur,
          numeros_utilisateur: utilisateur.numeros_utilisateur,
          type_utilisateur: utilisateur.libelle_type_utilisateur,
          assurance_utilisateur: utilisateur.nom_assurance,
          adresse_utilisateur: utilisateur.adresse_fournit,
          ville_utilisateur: utilisateur.ville_utilisateur,
          jwt_tokens: jwt_tokens,
        },
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération du profil => utilisateur: ${code_utilisateur} erreur: ${error.message}`,
      );
      connexion.release();
      console.log(error);
    } finally {
      connexion.release();
    }
  }

  //Ajouter une assurance à la liste des assurances possédée par l'utilisateur
  static async ajouterAssurance(codeUtilisateur, nomAssurance) {
    const connexion = await dataBase.getConnection();
    logger.info(
      `Tentative d'ajout d'assurance... => utilisateur: ${codeUtilisateur} assurance: ${nomAssurance}`,
    );
    try {
      await connexion.beginTransaction();
      const requete = await connexion.query(
        "SELECT id_assurance FROM assurance WHERE nom_assurance=?",
        [nomAssurance],
      );
      let id_assurance = requete[0][0]?.id_assurance;
      if (!id_assurance) {
        logger.info("Assurance inconnue. Ajout au système...");
        const requete2 = await connexion.query(
          "INSERT INTO assurance(nom_assurance)VALUES(?)",
          [nomAssurance],
        );
        logger.info(
          `Nouvelle assurance ajouté => nom_assurance: ${nomAssurance}`,
        );
        id_assurance = requete2.insertId;
      }
      //Enregistrement de l'assurance
      const requete3 = await connexion.query(
        "INSERT INTO utilisateur_assurance(code_utilisateur,id_assurance) VALUES (?,?)",
        [codeUtilisateur, id_assurance],
      );

      connexion.commit();

      logger.info(
        `Assurance ajoutée à la liste des assurances de l'utilisateur avec succès.`,
      );

      return {
        success: true,
        message:
          "Assurance ajoutée à la liste des assurances de l'utilisateur avec succès !",
      };
    } catch (error) {
      await connexion.rollback();
      logger.error(
        `Erreur lors de l'ajout de l'assurance pour utilisateur: ${codeUtilisateur} erreur: ${error.message}`,
      );
      console.log(error);
      return {
        success: false,
        message:
          "Impossible d'ajouter l'assurance à la liste des assurances de l'utilisateur",
      };
    } finally {
      connexion.release();
    }
  }

  //Envoyer position de l'utilisateur
  static async envoyerLocalisation(code_utilisateur, latitude, longitude) {
    const connexion = await dataBase.getConnection();
    logger.info(
      `Envoi de la localisation pour utilisateur: ${code_utilisateur} coordonnées:[latitude: ${latitude},longitude: ${longitude}]`,
    );
    try {
      await connexion.beginTransaction();

      logger.info(
        `Vérification de l'existance de l'utilisateur... => utilisateur: ${code_utilisateur}`,
      );
      const requete = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [code_utilisateur],
      );
      const utilisateur = requete[0][0]?.code_utilisateur;
      if (!utilisateur) {
        logger.info(
          `Aucun utilisateur trouvé => utilisateur: ${code_utilisateur}`,
        );
        return {
          success: false,
          message: "Aucun utilisateur trouvé. Veuillez vous inscrire",
        };
      }
      logger.info(
        `Mise à jour de l'adresse utilisateur avec les nouvelles coordonnées...`,
      );
      //Mise à jour de la table adresseUtilisateur
      const requete3 = await connexion.query(
        "UPADTE adresse_utilisateur SET latitude=?,longitude=? WHERE code_utilisateur=?",
        [latitude, longitude, utilisateur],
      );

      connexion.commit();
      logger.info(`Adresse utilisateur mise à jour avec succès!`);
      return {
        success: true,
        message: "Position envoyé",
      };
    } catch (error) {
      await connexion.rollback();

      logger.error(
        `Erreur lors de l'envoie des coordonnées utilisateur. Erreur: ${error.message}`,
      );
      console.log(error);
      return {
        success: false,
        message: "Impossible d'envoyer la position de l'utilisateur",
      };
    } finally {
      connexion.release();
    }
  }

  //Envoyer FCM token
  static async envoyerFCMToken(code_utilisateur, fcm_tokens) {
    const connexion = await dataBase.getConnection();

    logger.info(
      `Tentantive d'envoi FCM Token... utilisateur: ${code_utilisateur}`,
    );
    try {
      //Vérifier l'existance de l'utilisateur

      logger.debug(
        `Vérification existance utilisateur... => utilisateur: ${code_utilisateur}`,
      );
      const verif1 = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [code_utilisateur],
      );

      if (verif1[0].length == 0) {
        logger.warn(
          `Aucun utilisateur trouvé utilisateur: ${code_utilisateur}`,
        );
        return {
          success: false,
          message: "Aucun utilisateur trouvé. Veuillez vous inscrire",
        };
      }

      logger.info("Enregristement du FCM Token...");
      //Metter à jour le FCM token
      const majToken = await connexion.query(
        "UPDATE utilisateurs set fcm_tokens=? WHERE code_utilisateur=?",
        [fcm_tokens, code_utilisateur],
      );

      if (majToken) {
        logger.info("FCM Token enregistré avec succès!");
        return {
          success: true,
          message: "FCM Tokens mis à jour avec succès !",
        };
      }
    } catch (error) {
      logger.error(
        `Erreur lors de l'envoie du FCM Token. Erreur: ${error.message}`,
      );
      return {
        success: false,
        message: "Une erreur s'est produite",
      };
    } finally {
      connexion.release();
    }
  }
}
module.exports = utilisateur;
