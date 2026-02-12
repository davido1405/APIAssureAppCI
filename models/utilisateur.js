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
    let datePaiem = new Date().toString().slice(0, 10).replace(/-/g, "");
    let partieAlea = this.randomAlphaNum(5);

    let code_utilisateur = prefix + "-" + datePaiem + "-" + partieAlea;
    return code_utilisateur;
  }
  //Connexion
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
        "INSERT INTO adresse_utilisateur (adresse_fournit) VALUES(?)",
        [adresseUtilisateur],
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
}
module.exports = utilisateur;

//https://youtu.be/YkBOkV0s5eQ?si=LkjKoQtlYbqwsVoj
