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
    adresseUtilisateur,
  ) {
    const connexion = await dataBase.getConnection();
    try {
      await connexion.beginTransaction();

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
          message: "Un compte existe déjà pour ce numéro",
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
      //Inserer dans adresse utilisateur
      const rows2 = await connexion.query(
        "INSERT INTO adresse_utilisateur (code_utilisateur,adresse_fournit) VALUES(?,?)",
        [code_utilisateur, adresseUtilisateur],
      );

      const rows = await connexion.query(
        "INSERT INTO utilisateurs (code_utilisateur,nom_utilisateur,prenom_utilisateur,numeros_utilisateur,password_hash,id_type_utilisateur,id_assurance,id_adresse) VALUES (?,?,?,?,?,?,?,?)",
        [
          code_utilisateur,
          nomUtilisateur,
          prenomUtilisateur,
          numeroUtilisateur,
          codePinUtilisateur,
          type,
          idAssurance,
          rows2[0].insertId,
        ],
      );

      await connexion.commit();

      return {
        success: true,
        message: "Inscription effectuée avec succès !",
        data: {
          nom_utilisateur: nomUtilisateur,
          prenom_utilisateur: prenomUtilisateur,
          numeros_utilisateur: numeroUtilisateur,
          password_hash: codePinUtilisateur,
          type_utilisateur: type_utilisateur,
          assurance_utilisateur: assuranceUtilisateur,
          adresse_utilisateur: adresseUtilisateur,
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
        "SELECT u.code_utilisateur,u.nom_utilisateur,u.prenom_utilisateur,u.numeros_utilisateur,u.password_hash,u.fcm_tokens,t.libelle_type_utilisateur,a.nom_assurance,ad.adresse_fournit FROM utilisateurs as u INNER JOIN type_utilisateur as t ON t.id_type_utilisateur=u.id_type_utilisateur INNER JOIN assurances as a ON a.id_assurance=u.id_assurance INNER JOIN adresse_utilisateur as ad ON ad.id_adresse=u.id_adresse WHERE numeros_utilisateur=?",
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
          jwt_tokens: jwt_tokens,
        },
      };
    } catch (error) {
      console.log(error);
    }
  }

  //Récupérer le profil
  static async profilUtilisateur(codeUtilisateur) {
    if (!codeUtilisateur) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs. Merci",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "SELECT u.code_utilisateur,u.nom_utilisateur,u.prenom_utilisateur,u.numeros_utilisateur,u.password_hash,u.fcm_tokens,t.libelle_type_utilisateur,a.nom_assurance,ad.adresse_fournit FROM utilisateurs as u INNER JOIN type_utilisateur as t ON t.id_type_utilisateur=u.id_type_utilisateur INNER JOIN assurances as a ON a.id_assurance=u.id_assurance INNER JOIN adresse_utilisateur as ad ON ad.id_adresse=u.id_adresse WHERE u.code_utilisateur=?",
        [codeUtilisateur],
      );
      const utilisateur = requete[0][0];

      if (!utilisateur) {
        return {
          success: false,
          message: "Aucun profil trouvé pour cet utilisateur",
        };
      }
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
}
module.exports = utilisateur;

//https://youtu.be/YkBOkV0s5eQ?si=LkjKoQtlYbqwsVoj
