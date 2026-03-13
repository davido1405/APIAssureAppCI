// services/NotificationService.js

const { messaging } = require("../config/firebase.config");
const dataBase = require("../config/db_config");

class NotificationService {
  /**
   * Envoyer une notification push à plusieurs utilisateurs
   *
   * @param {Object} notificationData - Données de la notification
   * @param {string} notificationData.titre - Titre de la notification
   * @param {string} notificationData.message - Corps du message
   * @param {string} notificationData.image_url - URL de l'image (optionnel)
   * @param {string} notificationData.type - Type de notification (annonce, newsletter, etc.)
   * @param {Object} notificationData.data - Données supplémentaires
   * @param {Array<string>} tokens - Liste des tokens FCM
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  static async envoyerNotificationMultiple(notificationData, tokens) {
    try {
      console.log("=== ENVOI NOTIFICATION PUSH ===");
      console.log("Titre:", notificationData.titre);
      console.log("Nombre de tokens:", tokens.length);

      if (tokens.length === 0) {
        return {
          success: false,
          message: "Aucun token fourni",
          nb_envoyes: 0,
          nb_recus: 0,
        };
      }

      // Préparer le payload
      const payload = this.creerPayload(notificationData);

      // Envoyer en batch (Firebase limite à 500 tokens par batch)
      const batchSize = 500;
      let totalEnvoyes = 0;
      let totalRecus = 0;
      const tokensInvalides = [];

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);

        try {
          const response = await messaging.sendEachForMulticast({
            ...payload,
            tokens: batch,
          });

          totalEnvoyes += batch.length;
          totalRecus += response.successCount;

          console.log(
            `✅ Batch ${Math.floor(i / batchSize) + 1}: ${response.successCount}/${batch.length} envoyés`,
          );

          // Collecter les tokens invalides
          if (response.failureCount > 0) {
            response.responses.forEach((resp, index) => {
              if (!resp.success) {
                const error = resp.error;

                // Codes d'erreur indiquant un token invalide
                if (
                  error?.code === "messaging/invalid-registration-token" ||
                  error?.code === "messaging/registration-token-not-registered"
                ) {
                  tokensInvalides.push(batch[index]);
                }
              }
            });
          }
        } catch (error) {
          console.error(
            `❌ Erreur batch ${Math.floor(i / batchSize) + 1}:`,
            error,
          );
        }
      }

      // Nettoyer les tokens invalides
      if (tokensInvalides.length > 0) {
        await this.nettoyerTokensInvalides(tokensInvalides);
      }

      console.log(
        `✅ Total: ${totalRecus}/${totalEnvoyes} notifications envoyées`,
      );

      return {
        success: true,
        message: "Notifications envoyées",
        nb_envoyes: totalEnvoyes,
        nb_recus: totalRecus,
        nb_echecs: totalEnvoyes - totalRecus,
      };
    } catch (error) {
      console.error("❌ Erreur envoyerNotificationMultiple:", error);
      return {
        success: false,
        message: "Erreur lors de l'envoi",
        error: error.message,
      };
    }
  }

  /**
   * Envoyer une notification à un seul utilisateur
   */
  static async envoyerNotificationUnique(notificationData, token) {
    try {
      console.log("=== ENVOI NOTIFICATION UNIQUE ===");
      console.log("Token:", token.substring(0, 20) + "...");

      const payload = this.creerPayload(notificationData);

      const response = await messaging.send({
        ...payload,
        token: token,
      });

      console.log("✅ Notification envoyée:", response);

      return {
        success: true,
        message: "Notification envoyée",
        messageId: response,
      };
    } catch (error) {
      console.error("❌ Erreur envoyerNotificationUnique:", error);

      // Gérer les tokens invalides
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        await this.nettoyerTokensInvalides([token]);
      }

      return {
        success: false,
        message: "Erreur lors de l'envoi",
        error: error.message,
      };
    }
  }

  /**
   * Créer le payload de notification
   */
  static creerPayload(notificationData) {
    const {
      titre,
      message,
      image_url,
      type,
      priorite = "normal",
      data = {},
    } = notificationData;

    return {
      notification: {
        title: titre,
        body: message,
        image: image_url || undefined,
      },
      data: {
        type: type || "general",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data,
      },
      android: {
        priority: priorite === "high" ? "high" : "normal",
        notification: {
          sound: "default",
          channelId: type || "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          color: this.getCouleurParType(type),
          icon: "ic_notification",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
    };
  }

  /**
   * Nettoyer les tokens invalides de la base de données
   */
  static async nettoyerTokensInvalides(tokens) {
    if (tokens.length === 0) return;

    let connexion;

    try {
      connexion = await dataBase.getConnection();

      console.log(`🗑️ Nettoyage de ${tokens.length} token(s) invalide(s)`);

      // Supprimer les tokens invalides
      // Option 1 : Supprimer complètement
      await connexion.query(
        "DELETE FROM utilisateurs WHERE fcm_tokens IN (?)",
        [tokens],
      );

      // Option 2 : Mettre à NULL (si vous voulez garder l'utilisateur)
      // await connexion.query(
      //   'UPDATE utilisateurs SET fcm_tokens = NULL WHERE fcm_tokens IN (?)',
      //   [tokens]
      // );

      console.log("✅ Tokens invalides nettoyés");
    } catch (error) {
      console.error("❌ Erreur nettoyage tokens:", error);
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Obtenir la couleur selon le type de notification
   */
  static getCouleurParType(type) {
    switch (type) {
      case "annonce":
      case "promotion":
        return "#FF9800"; // Orange
      case "urgence":
        return "#F44336"; // Rouge
      case "newsletter":
        return "#9C27B0"; // Violet
      default:
        return "#2196F3"; // Bleu
    }
  }

  /**
   * Envoyer une notification à des utilisateurs spécifiques par leurs codes
   */
  static async envoyerAuxUtilisateurs(notificationData, codesUtilisateurs) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();

      // Récupérer les tokens FCM des utilisateurs
      const [utilisateurs] = await connexion.query(
        `SELECT fcm_tokens 
         FROM utilisateurs 
         WHERE code_utilisateur IN (?)
           AND fcm_tokens IS NOT NULL
           AND fcm_tokens != ''`,
        [codesUtilisateurs],
      );

      // Extraire tous les tokens
      const tokens = [];
      for (const utilisateur of utilisateurs) {
        if (utilisateur.fcm_tokens) {
          // Gérer le cas où plusieurs tokens sont séparés par des virgules
          const tokensArray = utilisateur.fcm_tokens
            .split(",")
            .map((t) => t.trim());
          tokens.push(...tokensArray);
        }
      }

      // Envoyer les notifications
      return await this.envoyerNotificationMultiple(notificationData, tokens);
    } catch (error) {
      console.error("❌ Erreur envoyerAuxUtilisateurs:", error);
      return {
        success: false,
        message: "Erreur lors de l'envoi",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Envoyer à tous les abonnés d'une pharmacie
   */
  static async envoyerAuxAbonnes(notificationData, codePharmacier) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();

      // Récupérer les tokens des abonnés
      const [abonnes] = await connexion.query(
        `SELECT u.fcm_tokens
         FROM utilisateurs u
         INNER JOIN newsletter n ON n.code_utilisateur = u.code_utilisateur
         WHERE n.code_pharmacie = ?
           AND u.fcm_tokens IS NOT NULL
           AND u.fcm_tokens != ''`,
        [codePharmacier],
      );

      // Extraire les tokens
      const tokens = [];
      for (const abonne of abonnes) {
        if (abonne.fcm_tokens) {
          const tokensArray = abonne.fcm_tokens.split(",").map((t) => t.trim());
          tokens.push(...tokensArray);
        }
      }

      console.log(`📱 ${tokens.length} token(s) d'abonnés trouvé(s)`);

      // Envoyer les notifications
      return await this.envoyerNotificationMultiple(notificationData, tokens);
    } catch (error) {
      console.error("❌ Erreur envoyerAuxAbonnes:", error);
      return {
        success: false,
        message: "Erreur lors de l'envoi",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Envoyer une notification de test
   */
  static async envoyerTest(token) {
    const notificationData = {
      titre: "Test Notification 🔔",
      message: "Ceci est une notification de test depuis AssurAppCI",
      type: "test",
      data: {
        test: "true",
        timestamp: new Date().toISOString(),
      },
    };

    return await this.envoyerNotificationUnique(notificationData, token);
  }
}

module.exports = NotificationService;
