// models/annonce.js

const dataBase = require("../config/db_config.js");
const logger = require("../logger.js");

class Annonces {
  static async envoyerAnnonce(titre, contenu, code_gerant, type_annonce) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      logger.debug(`Envoie d'annonce...`);
      console.log("=== ENVOI ANNONCE ===");
      console.log("Gérant:", code_gerant);
      console.log("Type:", type_annonce);

      logger.debug(`Vérification de l'existance de la pharmacie`);
      // ✅ 1. Vérifier l'existence de la pharmacie
      const [pharmacie] = await connexion.query(
        "SELECT u.code_pharmacie,p.nom_pharmacie FROM utilisateur_gerant as u INNER JOIN pharmacie as p ON p.code_pharmacie=u.code_pharmacie WHERE u.code_utilisateur = ?",
        [code_gerant],
      );

      if (pharmacie.length === 0) {
        logger.debug(`La pharmacie n'existe pas`);
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Aucune pharmacie ne correspond à ce gérant",
        };
      }

      // ✅ Déclarer la variable en dehors du if
      const code_pharmacie = pharmacie[0].code_pharmacie;
      console.log("✅ Pharmacie:", code_pharmacie);

      logger.debug(`Récupération du type d'annonce`);
      // ✅ 2. Récupérer l'id_type_annonce
      const [typeAnnonce] = await connexion.query(
        "SELECT id_type_annonce FROM type_annonce WHERE libelle_type_annonce = ?",
        [type_annonce],
      );

      if (typeAnnonce.length === 0) {
        logger.debug(`Type d'annonce ${type_annonce} inconnu`);
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: `Type d'annonce "${type_annonce}" non pris en charge`,
        };
      }

      // ✅ Déclarer la variable en dehors du if
      const id_type_annonce = typeAnnonce[0].id_type_annonce;
      console.log("✅ Type annonce ID:", id_type_annonce);

      logger.debug(`Récupération de tous les abonnés`);
      // ✅ 3. Récupérer tous les abonnés avec tokens FCM
      const [abonnes] = await connexion.query(
        `SELECT u.fcm_tokens, u.code_utilisateur 
         FROM utilisateurs u 
         INNER JOIN newsletter n ON n.code_utilisateur = u.code_utilisateur 
         WHERE n.code_pharmacie = ? 
           AND u.fcm_tokens IS NOT NULL 
           AND u.fcm_tokens != ''`,
        [code_pharmacie],
      );

      console.log(`📱 ${abonnes.length} abonné(s) avec token FCM`);

      // ✅ 4. Envoyer les notifications push
      let nb_notifications_envoyees = 0;
      let nb_notifications_recues = 0;

      if (abonnes.length > 0) {
        // Importer le service Firebase
        const { messaging } = require("../config/firebase.config");

        // Préparer les tokens
        const tokens = [];
        for (const abonne of abonnes) {
          if (abonne.fcm_tokens) {
            const tokensArray = abonne.fcm_tokens
              .split(",")
              .map((t) => t.trim());
            tokens.push(...tokensArray);
          }
        }

        console.log(`📤 Envoi à ${tokens.length} token(s)`);
        logger.debug(`Envoi de l'annonce à ${tokens.length} abonnés`);
        if (tokens.length > 0) {
          // Préparer le payload
          const payload = {
            notification: {
              title: `${pharmacie[0].nom_pharmacie} - ${titre}`,
              body: contenu.substring(0, 240),
            },
            data: {
              type: "annonce",
              pharmacie_code: code_pharmacie, // ✅ Variable maintenant accessible
              id_type_annonce: id_type_annonce.toString(), // ✅ Variable maintenant accessible
            },
            android: {
              priority: type_annonce === "Urgence" ? "high" : "normal",
              notification: {
                sound: "default",
                channelId: "annonces",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
          };

          // Envoyer en batch (500 max)
          const batchSize = 500;
          for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);

            try {
              const response = await messaging.sendEachForMulticast({
                ...payload,
                tokens: batch,
              });

              nb_notifications_envoyees += batch.length;
              nb_notifications_recues += response.successCount;

              console.log(
                `✅ Batch: ${response.successCount}/${batch.length} envoyés`,
              );
            } catch (error) {
              console.error("❌ Erreur envoi batch:", error);
            }
          }
        }
      }

      logger.debug(`Enregistrement de l'annonce...`);
      const [result1] = await connexion.query(
        // ✅ Ajout de la destructuration [result]
        "INSERT INTO annonce(titre, contenu, code_pharmacie, date_publication, id_type_annonce) VALUES(?, ?, ?, NOW(), ?)",
        [titre, contenu, code_pharmacie, id_type_annonce],
      );

      let result;

      logger.debug(`Enregistrement dans notifications pour chaque abonné`);
      for (const abonne of abonnes) {
        console.log(abonne.code_utilisateur);
        // ✅ 5. Enregistrer l'annonce en BD
        [result] = await connexion.query(
          // ✅ Ajout de la destructuration [result]
          "INSERT INTO notifications(id_annonce,titre, contenu, code_pharmacie, date_publication, id_type_annonce,code_utilisateur) VALUES(?,?, ?, ?, NOW(), ?,?)",
          [
            result1.insertId,
            titre,
            contenu,
            code_pharmacie,
            id_type_annonce,
            abonne.code_utilisateur,
          ],
        );
      }

      //console.log("✅ Annonce enregistrée (ID:", result.insertId, ")");

      // ✅ 6. Commit de la transaction
      await connexion.commit();

      logger.debug(`Annonce envoyées à tous les abonnés`);
      return {
        success: true,
        message: "Annonce envoyée avec succès",
        id_annonce: result.insertId || null, // ✅ Variable maintenant accessible
        nb_abonnes: abonnes.length,
        nb_notifications_envoyees,
        nb_notifications_recues,
      };
    } catch (error) {
      logger.error(`Erreur lors de l'envoie de l'annonce`);
      console.error("❌ Erreur envoyerAnnonce:", error);

      if (connexion) {
        await connexion.rollback();
      }

      return {
        success: false,
        message: "Une erreur s'est produite lors de l'envoi de l'annonce",
        error: error.message,
      };
    } finally {
      // ✅ Toujours libérer la connexion
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Récupérer les annonces d'une pharmacie
   */
  static async getAnnoncesParPharmacie(code_gerant, limit = 10) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();

      logger.debug(
        `Récupération des annonces d'une pharmacie code_gérant: ${code_gerant}`,
      );

      const [annonces] = await connexion.query(
        `SELECT 
          a.id_annonce,
          a.titre,
          a.contenu,
          a.date_publication,
          ta.libelle_type_annonce,
          a.nombre_vue
         FROM annonce a
         INNER JOIN type_annonce ta ON a.id_type_annonce = ta.id_type_annonce
         INNER JOIN utilisateur_gerant ug ON ug.code_pharmacie=a.code_pharmacie
         WHERE ug.code_utilisateur = ? AND a.id_type_annonce LIKE ?
         ORDER BY a.date_publication DESC
         LIMIT ?`,
        [code_gerant, 7, limit],
      );

      logger.debug(`Annonces récupérées avec succès`);
      return {
        success: true,
        total_annonces: annonces.length,
        data: annonces,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des annonces de la pharmacie code_gérant: ${code_gerant}`,
      );
      console.error("❌ Erreur getAnnoncesParPharmacie:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des annonces",
      };
    } finally {
      if (connexion) {
        connexion.release();
      }
    }
  }

  /**
   * Supprimer une annonce
   */
  static async supprimerAnnonce(id_annonce, code_gerant) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      logger.debug(
        `Vérifier que l'annonce appartient bien a la pharmacie géré par ${code_gerant} et l'existance de l'annonce ${id_annonce} par la même occasion`,
      );
      // Vérifier que l'annonce appartient bien au gérant
      const [annonce] = await connexion.query(
        `SELECT a.code_pharmacie,ug.code_pharmacie
         FROM annonce a
         INNER JOIN utilisateur_gerant ug ON a.code_pharmacie = ug.code_pharmacie
         WHERE a.id_annonce = ? AND ug.code_utilisateur = ?`,
        [id_annonce, code_gerant],
      );

      if (annonce.length === 0) {
        logger.debug(`Annonce introvable`);
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Annonce introuvable ou non autorisée",
        };
      }

      logger.debug(
        `Exécution de la requette de suppression pour l'annonce id_annonce: ${id_annonce}`,
      );
      // Supprimer l'annonce
      await connexion.query(
        "DELETE FROM annonce WHERE id_annonce = ? AND code_pharmacie=?",
        [id_annonce, annonce.code_pharmacie],
      );

      await connexion.commit();

      logger.debug(`Annonce id_annonce: ${id_annonce} supprimée avec succès`);
      return {
        success: true,
        message: "Annonce supprimée avec succès",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la suppression de l'annonce erreur: ${error.message}`,
      );
      console.error("❌ Erreur supprimerAnnonce:", error);

      if (connexion) {
        await connexion.rollback();
        connexion.release();
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

module.exports = Annonces;
