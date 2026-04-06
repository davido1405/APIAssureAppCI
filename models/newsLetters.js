const dataBase = require("../config/db_config.js");
const logger = require("../logger.js");

class NewsLetters {
  //Lister touts les abonnement
  static async ListerAbonnementNewsletter(codeUtilisateur) {
    logger.debug(`Récupération liste des abonnements aux pharmacies...`);
    if (!codeUtilisateur) {
      logger.debug(`Tentative listage d'abonnements sans code_utilisateur`);
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();
    try {
      logger.debug(
        `Exécution de la requête pour récupération des abonnements...`,
      );
      const requete = await connexion.query(
        `SELECT n.id_newsletter,n.date_abonnement,p.code_pharmacie,p.nom_pharmacie,p.numeros_pharmacie,a.latitude,a.longitude,a.adresse_fournit,p.email_pharmacie,sp.libelle_statut as statut_pharmacie,sn.libelle_statut as statut_abonnement FROM newsletter as n INNER JOIN pharmacie as p ON p.code_pharmacie=n.code_pharmacie INNER JOIN adresse_pharmacie as a ON a.code_pharmacie=p.code_pharmacie INNER JOIN statut as sp ON sp.id_statut=p.id_statut INNER JOIN statut as sn ON sn.id_statut=n.id_statut WHERE n.code_utilisateur=?`,
        [codeUtilisateur],
      );
      const abonnements = requete[0];
      logger.debug(`Fin d'exécution de la requête`);
      if (!abonnements || abonnements.length == 0) {
        logger.debug(`Aucun abonnement trouvé`);
        return {
          success: false,
          message: "Vous avez aucun abonnement en cours",
        };
      }

      logger.debug(`Liste des abonnements récupéré avec succès`);
      return {
        success: true,
        message: "Liste de vos abonnements Newsletters",
        data: abonnements,
      };
    } catch (error) {
      logger.error(
        `Une erreur s'est produite lors de la récupération de la liste des abonnement de l'utilisateur: ${codeUtilisateur}`,
      );
      connexion.release();
    } finally {
      connexion.release();
    }
  }
  //Souscrir à une newsletters
  static async sabonner(codePharmacie, codeUtilisateur) {
    logger.debug(`Abonnement à une pharmacie`);
    if (!(codePharmacie && codeUtilisateur)) {
      logger.debug(
        `Tentative d'abonnement à une pharmacie sans code_utilisateur et codePharmacie`,
      );
      return {
        success: false,
        message: "Veuillez tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();

    await connexion.beginTransaction();
    try {
      logger.debug(
        `Vérifier l'existance du compte de l'utilisateur ${codeUtilisateur}`,
      );
      //Vérifier l'existance du compte
      const requete = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [codeUtilisateur],
      );
      const existance = requete[0][0];
      if (!existance) {
        logger.debug(`Aucun compte n'existe pour cet utilisateur`);
        return {
          success: false,
          message: "Veuillez vous inscrir pour pouvoir vous abonner",
        };
      }

      logger.debug(`Vérification de l'existance de la pharmacie`);
      //Vérifier l'existance de la pharmacie
      const requete2 = await connexion.query(
        "SELECT code_pharmacie FROM pharmacie WHERE code_pharmacie=?",
        [codePharmacie],
      );
      const existancePharma = requete2[0][0];
      if (!existancePharma) {
        logger.debug(`Cette pharmacie n'existe pas`);
        return {
          success: false,
          message: "Cette pharmacie n'existe pas",
        };
      }

      logger.debug(`Vérifier si pas déjà abonné à la pharmcie`);
      //Vérifier si pas déjà un abonnement actif
      const requete3 = await connexion.query(
        "SELECT * FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=? AND id_statut=? ORDER BY date_abonnement DESC LIMIT 1",
        [codeUtilisateur, codePharmacie, 1],
      );

      const existanceAbonnement = requete3[0][0];
      if (existanceAbonnement) {
        logger.debug(
          `Un abonnement à cette pharmacie existe déjà pour cet utilisateur ${codeUtilisateur}`,
        );
        return {
          success: false,
          message: "Vous êtes déjà abonné à cette pharmacie",
        };
      }

      logger.debug(
        `Mise à jour du statut du dernier abonnement pour réactivation...`,
      );
      //Mettre à jour le statut du dernier abonnement pour le réactiver
      const requete4 = await connexion.query(
        "SELECT * FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=? AND id_statut=? ORDER BY date_abonnement DESC LIMIT 1",
        [codeUtilisateur, codePharmacie, 2],
      );

      const existanceAncienAbonnement = requete4[0][0];
      if (existanceAncienAbonnement) {
        logger.debug(`Réactivation du dernier abonnement`);
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
        logger.debug(`Ajout de l'abonnement...`);
        const requte6 = await connexion.query(
          "INSERT INTO newsletter(code_utilisateur,code_pharmacie) VALUES (?,?)",
          [codeUtilisateur, codePharmacie],
        );
      }

      connexion.commit();
      logger.debug(`Abonnement éffectué avec succès !`);
      return {
        success: true,
        message: "Abonnement éffectué avec succès !",
      };
    } catch (error) {
      logger.debug(
        `Erreur lors de l'abonnement à cette pharmcie erreur: ${error.message}`,
      );
      console.log(error);

      await connexion.rollback();
      connexion.release();

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
    logger.debug(`Suppression d'un abonnement...`);
    if (!(codePharmacie, codeUtilisateur)) {
      logger.debug(
        `Tentative de suppression d'abonnement sans code_pharmacie ou code_utilisateur`,
      );
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(`Vérification de l'existance du compte utilisateur`);
      //Vérifier l'existance du compte
      const requete1 = await connexion.query(
        "SELECT code_utilisateur FROM utilisateurs WHERE code_utilisateur=?",
        [codeUtilisateur],
      );
      const existance = requete1[0][0];
      if (!existance) {
        logger.debug(`Compte utilisateur inexistant`);
        return {
          success: false,
          message: "Veuillez vous inscrir pour pouvoir vous abonner",
        };
      }

      logger.debug(`Vérification de l'existance de la pharmacie`);
      //Vérifier l'existance de la pharmacie
      const requete0 = await connexion.query(
        "SELECT code_pharmacie FROM pharmacie WHERE code_pharmacie=?",
        [codePharmacie],
      );
      const existancePharma = requete0[0][0];
      if (!existancePharma) {
        logger.debug(`La pharmacie n'existe pas`);
        return {
          success: false,
          message: "Cette pharmacie n'existe pas",
        };
      }
      logger.debug(
        `Vérification de l'existance d'un abonnement pour cette pharmacie... =>utilisateur: ${codeUtilisateur} pharmacie: ${codePharmacie}`,
      );
      const requete2 = await connexion.query(
        "SELECT id_newsletter FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=?",
        [codeUtilisateur, codePharmacie],
      );
      const abonnement = requete2[0][0];
      if (!abonnement) {
        logger.debug(
          `Aucun abonnement trouvé pour utilisateur: ${codeUtilisateur} pharmacie: ${codePharmacie}`,
        );
        return {
          success: false,
          message: "Vous n'avez aucun abonnement en cours pour cette pharmacie",
        };
      }
      logger.debug(`Suppression de l'abonnement...`);
      const requete = await connexion.query(
        "DELETE FROM newsletter WHERE code_utilisateur=? AND code_pharmacie=?",
        [codeUtilisateur, codePharmacie],
      );
      logger.debug(`Abonnement supprimé avec succès !`);

      return {
        success: true,
        message:
          "Votre abonnement pour cette pharmacie a été supprimé avec succès !",
      };
    } catch (error) {
      logger.debug(
        `Erreur lors de la suppression de l'abonnement. utilisateur: ${codeUtilisateur} pharmacie: ${codePharmacie}`,
      );
      console.log(error);
      connexion.release();
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
