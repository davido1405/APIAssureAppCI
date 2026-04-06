const { messaging } = require("firebase-admin");
const dataBase = require("../config/db_config");
const logger = require("../logger");

class AbonnementModel {
  // ===== RÉCUPÉRER LES FORFAITS DISPONIBLES =====
  static async recupererForfaits() {
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(`Récupération des forfaits...`);
      const [forfaits] = await connexion.query(`
        SELECT 
          f.id_forfait,
          f.nom_forfait,
          f.prix,
          f.duree_jours,
          f.description,
          GROUP_CONCAT(
            JSON_OBJECT(
              'nom', fn.nom_fonctionnalite,
              'code', fn.code_fonctionnalite,
              'limite', ff.limite_utilisation
            )
          ) as fonctionnalites
        FROM forfaits f
        LEFT JOIN forfait_fonctionnalites ff ON f.id_forfait = ff.id_forfait
        LEFT JOIN fonctionnalites fn ON ff.id_fonctionnalite = fn.id_fonctionnalite
        WHERE f.est_actif = 1
        GROUP BY f.id_forfait
        ORDER BY f.prix ASC
      `);

      logger.debug(`Forfait récupéré avec succès`);
      // Parser les fonctionnalités JSON
      return forfaits.map((forfait) => ({
        ...forfait,
        fonctionnalites: forfait.fonctionnalites
          ? JSON.parse(`[${forfait.fonctionnalites}]`)
          : [],
      }));
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des forfaits erreur: ${error.message}`,
      );
      connexion.release();
      return {
        success: false,
        message: "Impossible de récupérer les forfaits pour le moment",
      };
    } finally {
      connexion.release();
    }
  }

  // ===== RÉCUPÉRER L'ABONNEMENT ACTIF D'UNE PHARMACIE =====
  static async recupererAbonnementActif(code_pharmacie) {
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(`Vérification si code_utilisateur fournit`);
      if (!code_pharmacie) {
        logger.debug(
          `Tentative de récupération de l'abonnement actif sans le code_utilisateur`,
        );
        connexion.release();
        return {
          success: false,
          message:
            "Tentative de récupération de l'abonnement actif sans le code_utilisateur",
        };
      }
      logger.debug(
        `Vérification de l'existance de la pharmacie... => utilisateur: ${code_pharmacie}`,
      );
      const [utilisateur_gerant] = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=?",
        [code_pharmacie],
      );

      if (!utilisateur_gerant[0].code_pharmacie) {
        //Je me suis trompé donc j'ai préféré laisser le nom de la variable tel quel(sinon c'est code_utilisateur qu'on récupère)
        logger.debug(
          `Aucune pharmacie trouvé pour utilisateur: ${code_pharmacie}`,
        );
        return {
          success: false,
          message: "Aucune pharmacie trouvée pour ce gérant",
        };
      }
      logger.debug(
        `Exécution de la requette(récupération du forfait actif)... => pharmacie: ${utilisateur_gerant[0].code_pharmacie}`,
      );
      const [rows] = await connexion.query(
        `
        SELECT 
          a.id_abonnement,
          a.code_pharmacie,
          f.id_forfait,
          f.nom_forfait,
          f.prix,
          a.date_debut,
          a.date_fin,
          a.montant_paye,
          s.libelle_statut,
          DATEDIFF(a.date_fin, NOW()) as jours_restants
        FROM abonnements a
        INNER JOIN forfaits f ON a.id_forfait = f.id_forfait
        INNER JOIN statut s ON a.id_statut = s.id_statut
        WHERE a.code_pharmacie = ?
          AND a.date_fin > NOW()
          AND a.id_statut = 1
        ORDER BY a.date_fin DESC
        LIMIT 1
      `,
        [utilisateur_gerant[0].code_pharmacie],
      );

      if (rows.length === 0) {
        logger.debug(`Aucun abonnement actif donc forfait gratuit par défaut`);
        // Pas d'abonnement actif, retourner le forfait Gratuit par défaut
        const [forfaitGratuit] = await connexion.query(`
          SELECT 
            id_forfait,
            nom_forfait,
            prix,
            description
          FROM forfaits
          WHERE nom_forfait = 'Gratuit'
        `);

        return forfaitGratuit[0] || null;
      }
      logger.debug(
        `Fin exécution de la requette. forfait: ${rows[0].nom_forfait}`,
      );
      return rows[0];
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération du forfait de la pharmacie. erreur: ${error.message}`,
      );
      connexion.release();
    } finally {
      connexion.release();
    }
  }

  // ===== VÉRIFIER SI UNE FONCTIONNALITÉ EST DISPONIBLE =====
  static async verifierAccesFonctionnalite(code_gerant, code_fonctionnalite) {
    const connexion = await dataBase.getConnection();
    if (!(code_gerant && code_fonctionnalite)) {
      logger.debug(`Code gérant ou code_fonctionnalité manquant`);
      return {
        success: false,
        message: "Veuillez remplir tous les champs",
      };
    }

    logger.debug(`Vérification de l'accès à une fonctionnalité...`);
    try {
      logger.debug(
        `Récupération du code de la pharmacie en fonction du code gérant`,
      );
      //Récupérer le code de la pharmacie en fonction du code du gérant
      const [pharmacie] = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=?",
        [code_gerant],
      );

      if (!pharmacie[0]) {
        logger.debug(
          `Aucune pharmacie trouvé pour cet utilisateur ${code_gerant}`,
        );
        return {
          success: false,
          message: "Aucune pharmacie trouvé",
        };
      }
      // Récupérer l'abonnement actif
      const [abonnement] = await connexion.query(
        `
        SELECT a.id_abonnement, a.id_forfait
        FROM abonnements a
        WHERE a.code_pharmacie = ?
          AND a.date_fin > NOW()
          AND a.id_statut = 1
        ORDER BY a.date_fin DESC
        LIMIT 1
      `,
        [pharmacie[0].code_pharmacie],
      );

      let id_forfait;
      if (abonnement.length === 0) {
        logger.debug(
          `Aucun forfait trouvé. Donc forfait gratuit retourné par défaut`,
        );
        // Forfait gratuit par défaut
        const [forfaitGratuit] = await connexion.query(`
          SELECT id_forfait FROM forfaits WHERE nom_forfait = 'Gratuit'
        `);
        id_forfait = forfaitGratuit[0]?.id_forfait;
      } else {
        logger.debug(`Abonnement récupéré avec succès`);
        id_forfait = abonnement[0].id_forfait;
      }

      if (!id_forfait) {
        logger.debug(`Aucun forfait trouvé`);
        return { acces: false, raison: "Aucun forfait trouvé" };
      }

      logger.debug(
        `Vérification de l'accès à  la fonctionnalité... => pharmacie: ${pharmacie[0].code_pharmacie} fonctionnalité: ${code_fonctionnalite}`,
      );
      const [fonctionnalite] = await connexion.query(
        `
        SELECT 
          ff.limite_utilisation,
          fn.nom_fonctionnalite
        FROM forfait_fonctionnalites ff
        INNER JOIN fonctionnalites fn ON ff.id_fonctionnalite = fn.id_fonctionnalite
        WHERE ff.id_forfait = ?
          AND fn.code_fonctionnalite = ?
      `,
        [id_forfait, code_fonctionnalite],
      );

      if (fonctionnalite.length === 0) {
        logger.debug(
          `Fonctionnalité: ${fonctionnalite[0].nom_fonctionnalite} non incluse dans le forfait`,
        );
        return {
          acces: false,
          raison: "Fonctionnalité non incluse dans votre forfait",
        };
      }

      const limite = fonctionnalite[0].limite_utilisation;

      // Si pas de limite, accès illimité
      if (limite === null) {
        logger.debug(
          `Aucune limite d'utilisation => pharmacie: ${pharmacie[0].nom_pharmacie} fonctionnalite: ${fonctionnalite[0].nom_fonctionnalite}`,
        );
        return { acces: true, limite: null, utilise: 0 };
      }

      logger.debug(
        `Vérification limite d'utilisation... => pharmacie: ${pharmacie[0].nom_pharmacie} fonctionnalite: ${fonctionnalite[0].nom_fonctionnalite}`,
      );
      // Vérifier l'utilisation du mois en cours
      const [utilisation] = await connexion.query(
        `
        SELECT COUNT(*) as nb_utilisations
        FROM utilisation_fonctionnalites uf
        INNER JOIN fonctionnalites fn ON uf.id_fonctionnalite = fn.id_fonctionnalite
        WHERE uf.code_pharmacie = ?
          AND fn.code_fonctionnalite = ?
          AND MONTH(uf.date_utilisation) = MONTH(NOW())
          AND YEAR(uf.date_utilisation) = YEAR(NOW())
      `,
        [pharmacie[0].code_pharmacie, code_fonctionnalite],
      );

      const nb_utilisations = utilisation[0].nb_utilisations;

      if (nb_utilisations >= limite) {
        logger.debug(
          `Dépassement des limites d'utilisation => pharmacie:${pharmacie[0].nom_pharmacie} nombre_utilisation: ${nb_utilisations} limite: ${limite} fonctionnalité: ${fonctionnalite[0].nom_fonctionnalite}`,
        );
        return {
          acces: false,
          raison: `Limite atteinte (${limite} utilisations/mois)`,
          limite,
          utilise: nb_utilisations,
        };
      }

      logger.debug(
        `Accès autorisé à la fonctionnalité => pharmacie: ${pharmacie[0].nom_pharmacie} fonctionnalité: ${fonctionnalite[0].nom_fonctionnalite} restant: ${limite - nb_utilisations}`,
      );
      return {
        acces: true,
        limite,
        utilise: nb_utilisations,
        restant: limite - nb_utilisations,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la vérification de l'accès à la fonctionnalité: ${code_fonctionnalite} erreur: ${error.message}`,
      );
      connexion.release();
      return {
        acces: false,
      };
    } finally {
      connexion.release();
    }
  }

  // ===== ENREGISTRER UNE UTILISATION =====
  static async enregistrerUtilisation(code_pharmacie, code_fonctionnalite) {
    const connexion = await dataBase.getConnection();
    logger.debug(`Enregistrement de l'utilisation d'une fonctionnalité...`);
    if (!(code_pharmacie && code_fonctionnalite)) {
      return {
        success: false,
        message: "Veuillez remplir tous les champs",
      };
    }
    try {
      logger.debug(
        `Vérification de l'existance de la fonctionnalité... => pharmacie: ${code_pharmacie} fonctionnalité: ${code_fonctionnalite}`,
      );
      const [fonctionnalite] = await connexion.query(
        `
        SELECT id_fonctionnalite 
        FROM fonctionnalites 
        WHERE code_fonctionnalite = ?
      `,
        [code_fonctionnalite],
      );

      if (fonctionnalite.length === 0) {
        return { success: false, message: "Fonctionnalité introuvable" };
      }
      logger.debug(`Fonctionnalité récupéré avec succès !`);
      await connexion.query(
        `
        INSERT INTO utilisation_fonctionnalites 
        (code_pharmacie, id_fonctionnalite) 
        VALUES (?, ?)
      `,
        [code_pharmacie, fonctionnalite[0].id_fonctionnalite],
      );
      logger.debug(
        `Utilisation enrégistré => pharmacie: ${code_pharmacie} fonctionnalité: ${code_fonctionnalite} `,
      );
      return { success: true };
    } catch (error) {
      logger.error(
        `Erreur lors de l'enregistrement de l'utilisation de la fonctionnalité => erreur: ${error.message}`,
      );
      connexion.release();
      return {
        success: false,
      };
    } finally {
      connexion.release();
    }
  }

  // ===== SOUSCRIRE À UN FORFAIT =====
  static async souscrireForfait(
    code_gerant,
    nom_forfait,
    mode_paiement,
    reference_paiement,
  ) {
    const connexion = await dataBase.getConnection();

    if (!(code_gerant && nom_forfait && mode_paiement && reference_paiement)) {
      return {
        success: false,
        message: "Veuillez remplir tous les champs",
      };
    }

    try {
      await connexion.beginTransaction();
      logger.debug(
        `Récuépration du code de la pharmcie à partir du code gérant...`,
      );

      //Récupérer le code de la pharmacie à partir du code_utilisateur
      const [pharmacie] = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=?",
        [code_gerant],
      );

      if (pharmacie.length == 0) {
        logger.debug(
          `Aucune pharmacie trouvé pour cet utilisateur: ${code_gerant}`,
        );
        throw new Error("Aucune pharmacie trouvée");
      }

      logger.debug(`Récupération des infos des forfaits...`);
      // Récupérer les infos du forfait
      const [forfait] = await connexion.query(
        `
        SELECT * FROM forfaits WHERE nom_forfait = ?
      `,
        [nom_forfait],
      );

      if (forfait.length === 0) {
        logger.debug(`Forfait introuvable => forfait: ${nom_forfait}`);
        throw new Error("Forfait introuvable");
      }

      logger.debug(`Initialisation des dates...`);
      const date_debut = new Date();
      const date_fin = new Date();
      date_fin.setDate(date_fin.getDate() + forfait[0].duree_jours);

      logger.debug(`Désactivation des anciens forfaits...`);
      // Désactiver les abonnements précédents
      await connexion.query(
        `
        UPDATE abonnements 
        SET id_statut = 2 
        WHERE code_pharmacie = ? AND id_statut = 1
      `,
        [pharmacie[0].code_pharmacie],
      );

      logger.debug(`Mis à jour du nouvel abonnement`);
      // Créer le nouvel abonnement
      const [result] = await connexion.query(
        `
        INSERT INTO abonnements 
        (code_pharmacie, id_forfait, date_debut, date_fin, montant_paye, mode_paiement, reference_paiement, id_statut)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `,
        [
          pharmacie[0].code_pharmacie,
          forfait[0].id_forfait,
          date_debut,
          date_fin,
          forfait[0].prix,
          mode_paiement,
          reference_paiement,
        ],
      );

      logger.debug(`Enregistrement du paiement...`);
      // Enregistrer le paiement
      await connexion.query(
        `
        INSERT INTO paiements 
        (id_abonnement, montant, mode_paiement, reference_paiement, id_statut)
        VALUES (?, ?, ?, ?, 2)
      `,
        [result.insertId, forfait[0].prix, mode_paiement, reference_paiement],
      );

      await connexion.commit();
      logger.debug(`Souscription éffectuée avec succès !`);

      return {
        success: true,
        message: "Abonnement souscrit avec succès",
        id_abonnement: result.insertId,
        date_fin: date_fin,
      };
    } catch (error) {
      await connexion.rollback();
      connexion.release();
      console.error("Erreur souscrireForfait:", error);
      logger.debug(`Erreur lors de la souscription erreur: ${error.message}`);
      return {
        success: false,
        message: "Erreur lors de la souscription",
        error: error.message,
      };
    } finally {
      connexion.release();
    }
  }

  // ===== HISTORIQUE DES ABONNEMENTS =====
  static async historiqueAbonnements(code_pharmacie) {
    const connexion = await dataBase.getConnection();

    if (!code_pharmacie) {
      return {
        success: false,
        message: "Veuillez remplir tout les champs",
      };
    }
    logger.debug(
      `Récupération de l'historique d'abonnement... =>pharmacie: ${code_pharmacie}`,
    );
    try {
      logger.debug(`Exécution de la requette...`);
      const [rows] = await connexion.query(
        `
        SELECT 
          a.id_abonnement,
          f.nom_forfait,
          f.prix,
          a.date_debut,
          a.date_fin,
          a.montant_paye,
          s.libelle_statut,
          a.mode_paiement
        FROM abonnements a
        INNER JOIN forfaits f ON a.id_forfait = f.id_forfait
        INNER JOIN statut s ON a.id_statut = s.id_statut
        WHERE a.code_pharmacie = ?
        ORDER BY a.date_creation DESC
      `,
        [code_pharmacie],
      );
      logger.debug(`Historique récupéré avec succès !`);

      return rows;
    } catch (error) {
      logger.error(
        `Erreur s'est produite lors de la récupération de l'historique d'abonnement erreur: ${error.message}`,
      );
      connexion.release();
      return {
        success: false,
        message:
          "Impossible de récupérer l'historique d'abonnement pour le moment",
      };
    } finally {
      connexion.release();
    }
  }
}

module.exports = AbonnementModel;
