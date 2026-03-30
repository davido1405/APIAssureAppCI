// models/notifications.js

const dataBase = require("../config/db_config.js");

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

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
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

    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      // Vérifier que l'existance de la notification
      const [notification] = await connexion.query(
        `SELECT n.id_notification 
         FROM notifications n
         WHERE n.id_annonce = ? AND n.code_utilisateur = ?`,
        [id_annonce, code_utilisateur],
      );

      if (notification.length === 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Annonce introuvable ou non autorisée",
        };
      }

      // Marquer lu la notification
      await connexion.query(
        "UPDATE notifications SET id_statut=? WHERE id_annonce = ? AND code_utilisateur=?",
        [7, id_annonce, code_utilisateur],
      );

      //Vérifier si pas déjà compter
      const [deja_vue] = await connexion.query(
        "SELECT id_historique,date_vue FROM historique_vue WHERE id_annonce=? AND code_utilisateur=?",
        [id_annonce, code_utilisateur],
      );

      if (deja_vue.length > 0) {
        await connexion.commit();

        return {
          success: true,
          message: "Annonce lu avec succès",
        };
      }

      //Incrémenter le nombre de vue dans annonce
      await connexion.query(
        "UPDATE annonce SET nombre_vue=+1 WHERE id_annonce=?",
        [id_annonce],
      );

      //Historiser la vue
      await connexion.query(
        "INSERT INTO historique_vue(id_annonce,code_utilisateur)VALUES(?,?)",
        [id_annonce, code_utilisateur],
      );

      await connexion.commit();

      return {
        success: true,
        message: "Annonce lu avec succès",
      };
    } catch (error) {
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

      // Vérifier que l'annonce appartient bien au gérant
      const [notification] = await connexion.query(
        `SELECT n.code_utilisateur 
         FROM notifications n
         WHERE n.id_annonce = ? AND n.code_utilisateur = ?`,
        [id_annonce, code_utilisateur],
      );

      if (notification.length === 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Notification introuvable ou non autorisée",
        };
      }

      // Supprimer l'annonce
      await connexion.query(
        "DELETE FROM notifications WHERE id_annonce = ? AND  code_utilisateur=?",
        [id_annonce, code_utilisateur],
      );

      await connexion.commit();

      return {
        success: true,
        message: "Notification supprimée avec succès",
      };
    } catch (error) {
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
