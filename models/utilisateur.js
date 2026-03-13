const dataBase = require("../config/db_config.js");
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
    await connexion.beginTransaction();
    try {
      //Vérifier qu'il n'y a pas déjà un compte avec ce numéro
      const requ1 = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE numeros_utilisateur =?",
        [numeroUtilisateur],
      );
      const existe = requ1[0][0];
      if (existe) {
        await connexion.rollback();
        return {
          success: false,
          message: "Un compte existe déjà pour ce numéro.",
        };
      }
      //Récupérer l'id_type_utilisateur
      const requ = await connexion.query(
        "SELECT id_type_utilisateur FROM type_utilisateur WHERE libelle_type_utilisateur=?",
        [type_utilisateur],
      );
      const type = requ[0][0]?.id_type_utilisateur;
      if (!type) {
        await connexion.rollback();
        return {
          success: false,
          message: "Type utilisateur non défini",
        };
      }
      //Récupérer l'id_assurance
      const requ2 = await connexion.query(
        "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
        [assuranceUtilisateur],
      );
      let idAssurance = requ2[0][0]?.id_assurance || null;

      if (!idAssurance) {
        const ajout = await connexion.query(
          "INSERT INTO assurances (nom_assurance) VALUES(?)",
          [assuranceUtilisateur],
        );
        idAssurance = ajout[0].insertId;
      }
      const code_utilisateur = this.genererCodeUtilisateur();

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

      //Récupérer l'id_ville avant
      const [verifVille] = await connexion.query(
        "SELECT id_ville FROM villes where nom_ville=?",
        [ville_utilisateur],
      );
      let id_ville;
      if (verifVille.length > 0) {
        id_ville = verifVille[0].id_ville;
      } else {
        const [ajouterVille] = await connexion.query(
          "INSERT INTO villes(nom_ville)VALUES(?)",
          [ville_utilisateur],
        );
        id_ville = ajouterVille.insertId;
      }
      //Inserer dans adresse utilisateur
      const rows2 = await connexion.query(
        "INSERT INTO adresse_utilisateur (code_utilisateur,adresse_fournit,id_ville) VALUES(?,?,?)",
        [code_utilisateur, adresseUtilisateur, id_ville],
      );

      //Mettre maintenant l'adresse à jour
      const rows3 = await connexion.query(
        "UPDATE utilisateurs SET id_adresse=? WHERE code_utilisateur=?",
        [rows2[0].insertId, code_utilisateur],
      );

      await connexion.commit();

      //Juste pour les tests
      const jwt_tokens = "xdfkgjsnfsdfs5674gfdgrd684se-dfsgà)";

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
      console.error(error);
      return {
        success: false,
        message: "Inscription de l'utilisateur impossible",
      };
    }
  }

  //Connexion
  static async connexion(numeroUtilisateur, codePinUtilisateur) {
    if (!(numeroUtilisateur && codePinUtilisateur)) {
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
        return {
          success: false,
          message:
            "Aucun compte n'existe pour ce numéro. Veuillez vous inscrire ! Merci",
        };
      }
      if (!utilisateur?.password_hash == codePinUtilisateur) {
        return {
          success: false,
          message: "Veuillez vérifier votre mot de passe. Merci",
        };
      }

      //Juste pour les tests
      const jwt_tokens = "xdfkgjsnfsdfs5674gfdgrd684se-dfsgà)";

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
      console.log(error);
    }
  }

  //Récupérer le profil
  static async profilUtilisateur(code_utilisateur) {
    if (!code_utilisateur) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs. Merci",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "SELECT u.code_utilisateur,u.nom_utilisateur,u.prenom_utilisateur,u.numeros_utilisateur,u.fcm_tokens,t.libelle_type_utilisateur,a.nom_assurance,ad.adresse_fournit,v.nom_ville as ville_utilisateur FROM utilisateurs as u INNER JOIN type_utilisateur as t ON t.id_type_utilisateur=u.id_type_utilisateur LEFT JOIN assurances as a ON a.id_assurance=u.id_assurance LEFT JOIN adresse_utilisateur as ad ON ad.id_adresse=u.id_adresse LEFT JOIN villes as v ON v.id_ville=ad.id_ville WHERE u.code_utilisateur=?",
        [code_utilisateur],
      );
      const utilisateur = requete[0][0];

      if (!utilisateur) {
        return {
          success: false,
          message: "Aucun profil trouvé pour cet utilisateur",
        };
      }

      //Juste pour les tests
      const jwt_tokens = "xdfkgjsnfsdfs5674gfdgrd684se-dfsgà)";

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
      console.log(error);
    }
  }

  //Ajouter une assurance à la liste des assurances possédée par l'utilisateur
  static async ajouterAssurance(codeUtilisateur, nomAssurance) {
    const connexion = await dataBase.getConnection();
    try {
      await connexion.beginTransaction();
      const requete = await connexion.query(
        "SELECT id_assurance FROM assurance WHERE nom_assurance=?",
        [nomAssurance],
      );
      let id_assurance = requete[0][0]?.id_assurance;
      if (!id_assurance) {
        const requete2 = await connexion.query(
          "INSERT INTO assurance(nom_assurance)VALUES(?)",
          [nomAssurance],
        );
        id_assurance = requete2.insertId;
      }
      //Enregistrement de l'assurance
      const requete3 = await connexion.query(
        "INSERT INTO utilisateur_assurance(code_utilisateur,id_assurance) VALUES (?,?)",
        [codeUtilisateur, id_assurance],
      );

      connexion.commit();

      return {
        success: true,
        message:
          "Assurance ajoutée à la liste des assurances de l'utilisateur avec succès !",
      };
    } catch (error) {
      await connexion.rollback();
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
    try {
      await connexion.beginTransaction();
      const requete = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [code_utilisateur],
      );
      const utilisateur = requete[0][0]?.code_utilisateur;
      if (!utilisateur) {
        return {
          success: false,
          message: "Aucun utilisateur trouvé. Veuillez vous inscrire",
        };
      }
      //Mise à jour de la table adresseUtilisateur
      const requete3 = await connexion.query(
        "UPADTE adresse_utilisateur SET latitude=?,longitude=? WHERE code_utilisateur=?",
        [latitude, longitude, utilisateur],
      );

      connexion.commit();

      return {
        success: true,
        message: "Position envoyé",
      };
    } catch (error) {
      await connexion.rollback();
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

    try {
      //Vérifier l'existance de l'utilisateur
      const verif1 = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [code_utilisateur],
      );

      if (verif1[0].length == 0) {
        return {
          success: false,
          message: "Aucun utilisateur trouvé. Veuillez vous inscrire",
        };
      }

      //Metter à jour le FCM token
      const majToken = await connexion.query(
        "UPDATE utilisateurs set fcm_tokens=? WHERE code_utilisateur=?",
        [fcm_tokens, code_utilisateur],
      );

      if (majToken) {
        return {
          success: true,
          message: "FCM Tokens mis à jour avec succès !",
        };
      }
    } catch (error) {
      console.log(error);
      connexion.release;
      return {
        success: false,
        message: "Une erreur s'est produite",
      };
    }
  }
}
module.exports = utilisateur;
