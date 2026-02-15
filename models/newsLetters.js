const dataBase = require("../config/db_config.js");

class NewsLetters {
  //Lister touts les abonnement
  static async ListerAbonnementNewsletter(codeUtilisateur, filtre) {
    if (!codeUtilisateur) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();

    const requete = await connexion.query(
      `SELECT n.id_newsletter,n.date_abonnement,p.code_pharmacie,p.nom_pharmacie,p.numeros_pharmacie,a.latitude,a.longitude,a.adresse_fournit,p.email_pharmacie,sp.libelle_statut as statut_pharmacie,sn.libelle_statut as statut_abonnement FROM newsletter as n INNER JOIN pharmacie as p ON p.code_pharmacie=n.code_pharmacie INNER JOIN adresse_pharmacie as a ON a.code_pharmacie=p.code_pharmacie INNER JOIN statut as sp ON sp.id_statut=p.id_statut INNER JOIN statut as sn ON sn.id_statut=n.id_statut WHERE n.code_utilisateur=? ${filtre ? `AND sn.libelle_statut=?` : ""}`,
      filtre ? [codeUtilisateur, filtre] : [codeUtilisateur],
    );
    const abonnements = requete[0];

    if (!abonnements || abonnements.length == 0) {
      return {
        success: false,
        message: "Vous avez aucun abonnement en cours",
      };
    }

    return {
      success: true,
      message: "Liste de vos abonnements Newsletters",
      data: abonnements,
    };
  }
  //Souscrir à une newsletters
  static async sabonner(codePharmacie, codeUtilisateur) {
    if (!(codePharmacie && codeUtilisateur)) {
      return {
        success: false,
        message: "Veuillez tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();

    await connexion.beginTransaction();
    try {
      //Vérifier l'existance du compte
      const requete = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [codeUtilisateur],
      );
      const existance = requete[0][0];
      if (!existance) {
        return {
          success: false,
          message: "Veuillez vous inscrir pour pouvoir vous abonner",
        };
      }

      //Vérifier l'existance de la pharmacie
      const requete2 = await connexion.query(
        "SELECT code_pharmacie FROM pharmacie WHERE code_pharmacie=?",
        [codePharmacie],
      );
      const existancePharma = requete2[0][0];
      if (!existancePharma) {
        return {
          success: false,
          message: "Cette pharmacie n'existe pas",
        };
      }

      //Vérifier si pas déjà un abonnement actif
      const requete3 = await connexion.query(
        "SELECT * FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=? AND id_statut=? ORDER BY date_abonnement DESC LIMIT 1",
        [codeUtilisateur, codePharmacie, 1],
      );

      const existanceAbonnement = requete3[0][0];
      if (existanceAbonnement) {
        return {
          success: false,
          message: "Vous êtes déjà abonné à cette pharmacie",
        };
      }

      //Mettre à jour le statut du dernier abonnement pour le réactiver
      const requete4 = await connexion.query(
        "SELECT * FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=? AND id_statut=? ORDER BY date_abonnement DESC LIMIT 1",
        [codeUtilisateur, codePharmacie, 2],
      );

      const existanceAncienAbonnement = requete4[0][0];
      if (existanceAncienAbonnement) {
        const requete5 = await connexion.query(
          "UPDATE newsletter SET date_abonnement=NOW(),id_statut=?  WHERE code_utilisateur=? AND code_pharmacie=? AND id_newsletter=?",
          [
            1,
            codeUtilisateur,
            codePharmacie,
            existanceAncienAbonnement.id_newsletter,
          ],
        );
      } else {
        const requte6 = await connexion.query(
          "INSERT INTO newsletter(code_utilisateur,code_pharmacie) VALUES (?,?)",
          [codeUtilisateur, codePharmacie],
        );
      }

      connexion.commit();
      return {
        success: true,
        message: "Abonnement éffectué avec succès !",
      };
    } catch (error) {
      console.log(error);
      await connexion.rollback();

      return {
        success: false,
        message: "Impossible d'enregistrer l'abonnement",
      };
    } finally {
      connexion.release();
    }
  }
  //Supprimer abonnement
  static async supprimerabonnement(codePharmacie, codeUtilisateur) {
    if (!(codePharmacie, codeUtilisateur)) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();

    try {
      const requete = await connexion.query(
        "DELETE FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=?",
        [codeUtilisateur, codePharmacie],
      );

      return {
        success: true,
        message:
          "Votre abonnement pour cette pharmacie a été supprimé avec succès !",
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Impossible de supprimer votre abonnement réesayez plus tard",
      };
    } finally {
      connexion.release();
    }
  }
}
module.exports = NewsLetters;
