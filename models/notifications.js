// models/notifications.js

const dataBase = require("../config/db_config.js");
const logger = require("../logger.js");

class Notifications {
  /**
   * Récupérer toutes les notiifcations d'un utilisateur
   */
  static async getToutesLesNotifications(code_utilisateur, limit = 20) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();
      // ✅ S'assurer que limit est un nombre
      const limitNumber = parseInt(limit, 10) || 20;

      logger.debug(`Exécution de la requête de suppression...`);
      const [notifications] = await connexion.query(
        `SELECT 
          n.id_annonce,
          n.titre,
          n.contenu,
          n.date_publication,
          st.libelle_statut,
          ta.libelle_type_annonce,
          p.nom_pharmacie,
          p.photo_pharmacie
         FROM notifications n
         INNER JOIN type_annonce ta ON n.id_type_annonce = ta.id_type_annonce
         INNER JOIN statut st ON n.id_statut = st.id_statut
         INNER JOIN pharmacie p ON n.code_pharmacie = p.code_pharmacie
         WHERE n.code_utilisateur=? AND n.id_type_annonce NOT LIKE ?
         ORDER BY n.date_publication DESC
         LIMIT ?`,
        [code_utilisateur, 7, limitNumber],
      );

      logger.debug(`Requete exécutée avec succès`);
      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération de notification utilisateur: ${code_utilisateur} erreur: ${error.message}`,
      );
      console.error("❌ Erreur récupération des notifications:", error);
      return {
        success: false,
        message: "Erreur récupération des notifications:",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Marquer lu une notification pour un utilisateur
   */
  static async marquerLu(id_annonce, code_utilisateur) {
    let connexion;

    logger.debug(
      `Tentative de lecture de notification... utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
    );
    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      logger.debug(`Vérification existance de la notification: ${id_annonce}`);
      // Vérifier que l'existance de la notification
      const [notification] = await connexion.query(
        `SELECT n.id_notification 
         FROM notifications n
         WHERE n.id_annonce = ? AND n.code_utilisateur = ?`,
        [id_annonce, code_utilisateur],
      );

      if (notification.length === 0) {
        logger.debug(
          `Aucune notification trouvé. utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
        );
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Annonce introuvable ou non autorisée",
        };
      }

      logger.debug(
        `Marquage notification comme lu... utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
      );
      // Marquer lu la notification
      await connexion.query(
        "UPDATE notifications SET id_statut=? WHERE id_annonce = ? AND code_utilisateur=?",
        [7, id_annonce, code_utilisateur],
      );

      logger.debug(
        `Vérification si déjà marqué vue... utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
      );
      //Vérifier si pas déjà compter
      const [deja_vue] = await connexion.query(
        "SELECT id_historique,date_vue FROM historique_vue WHERE id_annonce=? AND code_utilisateur=?",
        [id_annonce, code_utilisateur],
      );

      if (deja_vue.length > 0) {
        logger.debug(
          `Déjà marqué vue utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
        );
        await connexion.commit();

        return {
          success: true,
          message: "Annonce lu avec succès",
        };
      }

      logger.debug(
        `Mise à jour nombre de vue pour la notification... utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
      );
      //Incrémenter le nombre de vue dans annonce
      await connexion.query(
        "UPDATE annonce SET nombre_vue=+1 WHERE id_annonce=?",
        [id_annonce],
      );

      logger.debug(`Historisation de vue`);
      //Historiser la vue
      await connexion.query(
        "INSERT INTO historique_vue(id_annonce,code_utilisateur)VALUES(?,?)",
        [id_annonce, code_utilisateur],
      );

      await connexion.commit();

      logger.debug(
        `Notification marqué lu et historisée avec succès! utilisateur: ${code_utilisateur} notification: ${id_annonce}`,
      );
      return {
        success: true,
        message: "Annonce lu avec succès",
      };
    } catch (error) {
      logger.error(
        `Erreur lecture de notification utilisateur: ${code_utilisateur} notification: ${id_annonce} erreur: ${error.message}`,
      );
      console.error("❌ Erreur lecture annonce:", error);

      if (connexion) {
        await connexion.rollback();
      }

      return {
        success: false,
        message: "Erreur lors de la lecture",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Supprimer une notification pour un utilisateur
   */
  static async supprimerNotification(id_annonce, code_utilisateur) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      logger.debug(
        `Tentative de suppression d'annonce... gerant: ${code_utilisateur} annonce: ${id_annonce}`,
      );

      logger.debug(`Vérifier que l'annonce appartient bien au gérant`);
      // Vérifier que l'annonce appartient bien au gérant
      const [notification] = await connexion.query(
        `SELECT n.code_utilisateur 
         FROM notifications n
         WHERE n.id_annonce = ? AND n.code_utilisateur = ?`,
        [id_annonce, code_utilisateur],
      );

      if (notification.length === 0) {
        logger.debug(
          `Aucune annonce correspondante trouvée gerant: ${code_utilisateur} annonce: ${id_annonce}`,
        );
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Notification introuvable ou non autorisée",
        };
      }
      logger.debug(`Suppression de l'annonce... annonce: ${id_annonce}`);
      // Supprimer l'annonce
      await connexion.query(
        "DELETE FROM notifications WHERE id_annonce = ? AND  code_utilisateur=?",
        [id_annonce, code_utilisateur],
      );

      await connexion.commit();

      logger.debug(
        `Annonce supprimée avec succès gérant: ${code_utilisateur} annonce: ${id_annonce}`,
      );
      return {
        success: true,
        message: "Notification supprimée avec succès",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la suppression de l'annonce: ${id_annonce} gérant: ${code_utilisateur} erreur: ${error.message}`,
      );
      console.error("❌ Erreur suppression notification:", error);

      if (connexion) {
        await connexion.rollback();
      }

      return {
        success: false,
        message: "Erreur lors de la suppression",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }
}

module.exports = Notifications;
