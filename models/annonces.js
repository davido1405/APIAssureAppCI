// models/annonce.js

const dataBase = require("../config/db_config.js");

class Annonces {
  static async envoyerAnnonce(titre, contenu, code_gerant, type_annonce) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();
      await connexion.beginTransaction();

      console.log("=== ENVOI ANNONCE ===");
      console.log("Gérant:", code_gerant);
      console.log("Type:", type_annonce);

      // ✅ 1. Vérifier l'existence de la pharmacie
      const [pharmacie] = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur = ?",
        [code_gerant],
      );

      if (pharmacie.length === 0) {
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

      // ✅ 2. Récupérer l'id_type_annonce
      const [typeAnnonce] = await connexion.query(
        "SELECT id_type_annonce FROM type_annonce WHERE libelle_type_annonce = ?",
        [type_annonce],
      );

      if (typeAnnonce.length === 0) {
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

        if (tokens.length > 0) {
          // Préparer le payload
          const payload = {
            notification: {
              title: titre,
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

      // ✅ 5. Enregistrer l'annonce en BD
      const [result] = await connexion.query(
        // ✅ Ajout de la destructuration [result]
        "INSERT INTO annonce(titre, contenu, code_pharmacie, date_publication, id_type_annonce) VALUES(?, ?, ?, NOW(), ?)",
        [titre, contenu, code_pharmacie, id_type_annonce],
      );

      console.log("✅ Annonce enregistrée (ID:", result.insertId, ")");

      // ✅ 6. Commit de la transaction
      await connexion.commit();

      return {
        success: true,
        message: "Annonce envoyée avec succès",
        id_annonce: result.insertId, // ✅ Variable maintenant accessible
        nb_abonnes: abonnes.length,
        nb_notifications_envoyees,
        nb_notifications_recues,
      };
    } catch (error) {
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
  static async getAnnoncesParPharmacie(code_pharmacie, limit = 10) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();

      const [annonces] = await connexion.query(
        `SELECT 
          a.id_annonce,
          a.titre,
          a.contenu,
          a.date_publication,
          ta.libelle_type_annonce
         FROM annonce a
         INNER JOIN type_annonce ta ON a.id_type_annonce = ta.id_type_annonce
         WHERE a.code_pharmacie = ?
         ORDER BY a.date_publication DESC
         LIMIT ?`,
        [code_pharmacie, limit],
      );

      return {
        success: true,
        data: annonces,
      };
    } catch (error) {
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
   * Récupérer toutes les annonces (pour tous les utilisateurs)
   */
  static async getToutesLesAnnonces(limit = 50) {
    let connexion;

    try {
      connexion = await dataBase.getConnection();

      const [annonces] = await connexion.query(
        `SELECT 
          a.id_annonce,
          a.titre,
          a.contenu,
          a.date_publication,
          ta.libelle_type_annonce,
          p.nom_pharmacie,
          p.photo_pharmacie
         FROM annonce a
         INNER JOIN type_annonce ta ON a.id_type_annonce = ta.id_type_annonce
         INNER JOIN pharmacie p ON a.code_pharmacie = p.code_pharmacie
         ORDER BY a.date_publication DESC
         LIMIT ?`,
        [limit],
      );

      return {
        success: true,
        data: annonces,
      };
    } catch (error) {
      console.error("❌ Erreur getToutesLesAnnonces:", error);
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

      // Vérifier que l'annonce appartient bien au gérant
      const [annonce] = await connexion.query(
        `SELECT a.code_pharmacie 
         FROM annonce a
         INNER JOIN utilisateur_gerant ug ON a.code_pharmacie = ug.code_pharmacie
         WHERE a.id_annonce = ? AND ug.code_utilisateur = ?`,
        [id_annonce, code_gerant],
      );

      if (annonce.length === 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Annonce introuvable ou non autorisée",
        };
      }

      // Supprimer l'annonce
      await connexion.query("DELETE FROM annonce WHERE id_annonce = ?", [
        id_annonce,
      ]);

      await connexion.commit();

      return {
        success: true,
        message: "Annonce supprimée avec succès",
      };
    } catch (error) {
      console.error("❌ Erreur supprimerAnnonce:", error);

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

module.exports = Annonces;
