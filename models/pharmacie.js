const dataBase = require("../config/db_config.js");

const logger = require("../logger.js");

const { degreesToRadians, distance } = require("../utils/calculdistances.js");

const notificationPush = require("../services/NotificationService.js");
const { log } = require("winston");

class Pharmacie {
  static randomAlphaNum(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  //Générer un code pharmacie
  static genererCodePharmacie() {
    let prefix = "PHARM";
    let datePaiem = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let partieAlea = this.randomAlphaNum(5);

    let code_utilisateur = prefix + "-" + datePaiem + "-" + partieAlea;
    return code_utilisateur;
  }
  //Récupérer le profil de la pharmacie
  static async profilPharmacie(code_gerant) {
    const connexion = await dataBase.getConnection();
    logger.debug(`Récupération du profil de la pharmacie...`);
    try {
      logger.debug(`Recherche de pharmacie associé au gérant: ${code_gerant}`);
      const requete = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=? AND id_statut=?",
        [code_gerant, 1],
      );
      const code_pharma = requete[0][0]?.code_pharmacie;

      if (!code_pharma) {
        logger.debug(
          `Aucune pharmacie associé à ce gérant =>gérant: ${code_gerant}`,
        );
        return {
          success: false,
          message: "Aucune pharmacie trouvé",
        };
      }

      logger.debug(
        `Récupération du profil associé au gérant: ${code_gerant} pharmacie: ${code_pharma}`,
      );
      //Récupérer maintenant le profil de la pharmacie
      const requete2 = await connexion.query(
        `SELECT 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  GROUP_CONCAT(DISTINCT h.en_semaine SEPARATOR ', ') as horaire_semaine,
  GROUP_CONCAT(DISTINCT h.samedi SEPARATOR ', ') as horaire_samedi,
  GROUP_CONCAT(DISTINCT h.dimanche SEPARATOR ', ') as horaire_dimanche,
  p.est_de_garde as statut_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p
LEFT JOIN horaires_ouverture as h ON h.code_pharmacie=p.code_pharmacie
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
LEFT JOIN villes as v ON v.id_ville=a.id_ville
WHERE p.code_pharmacie = ?
GROUP BY 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  h.en_semaine,
  h.samedi,
  h.dimanche,
  p.email_pharmacie,
  p.est_de_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut`,
        [code_pharma],
      );
      const profilPharma = requete2[0][0];

      logger.debug(`Profil pharamcie récupéré avec succès`);
      return {
        success: true,
        message: "Profil de la pharmacie récupéré avec succès !",
        data: profilPharma,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération du profil de la pharmacie associé au gérant: ${code_gerant}`,
      );
      console.log(error);
      return {
        success: false,
        message: "Impossible de récupérer le profil de la pharmacie",
      };
    } finally {
      connexion.release();
    }
  }
  //Ajouter à la liste des assurances acceptées
  static async ajouterAssurance(codePharmacie, liste_assurance) {
    logger.debug(`Ajout d'assurance acceptée(s)...`);
    if (!codePharmacie || !Array.isArray(liste_assurance)) {
      logger.debug(
        `Tentative d'ajout d'assurance sans code_pharmacie ou liste assurance acceptée n'est pas une liste`,
      );
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      await connexion.beginTransaction();
      logger.debug(
        `Ajout d'assurance acceptée(s)... => pharmacie: ${codePharmacie}`,
      );
      let i = 0;
      let j = 0;
      for (const assurance of liste_assurance) {
        logger.debug(
          `Vérification existe de l'assurance dans le système... => assurance: ${assurance}`,
        );
        const requete = await connexion.query(
          "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
          [assurance],
        );
        let id_assurance = requete[0][0]?.id_assurance;
        if (!id_assurance) {
          logger.debug(`L'assurance n'existe pas encore. Ajout...`);
          i += 1;
          const requete2 = await connexion.query(
            "INSERT INTO assurances(nom_assurance)VALUES(?)",
            [assurance],
          );
          id_assurance = requete2[0].insertId;
        }
        logger.debug(
          `Enregistrement dans la liste des assurances acceptées pour pharmacie: ${codePharmacie}`,
        );
        //Enregistrement de l'assurance
        const requete3 = await connexion.query(
          "INSERT INTO pharmacie_assurance(code_pharmacie,id_assurance) VALUES (?,?)",
          [codePharmacie, id_assurance],
        );
        j += 1;
      }

      connexion.commit();
      logger.debug(`${i} nouvelle(s) assurance(s) ajoutée(s)`);

      logger.debug(
        `${j} assurance(s) acceptée(s) par pharmacie: ${codePharmacie}`,
      );
      return {
        success: true,
        message:
          "Assurance ajoutée à la liste des assurances prises en charge avec succès !",
      };
    } catch (error) {
      logger.error(
        `Erreur lors de l'ajout des assurances acceptées par pharmacie: ${codePharmacie}`,
      );
      await connexion.rollback();
      console.log(error);
      return {
        success: false,
        message:
          "Impossible d'ajouter l'assurance à la liste des assurances prises en charge",
      };
    } finally {
      connexion.release();
    }
  }
  //Récupérer toutes les pharmacie du système
  static async toutePharmacies(
    limits,
    longitude,
    latitude,
    adresse_utilisateur,
  ) {
    const connexion = await dataBase.getConnection();

    logger.debug(`Récupération de toutes les pharmacies du système...`);
    try {
      const requete = await connexion.query(
        `SELECT 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  GROUP_CONCAT(DISTINCT h.en_semaine SEPARATOR ', ') as horaire_semaine,
  GROUP_CONCAT(DISTINCT h.samedi SEPARATOR ', ') as horaire_samedi,
  GROUP_CONCAT(DISTINCT h.dimanche SEPARATOR ', ') as horaire_dimanche,
  p.est_de_garde as statut_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p
LEFT JOIN horaires_ouverture as h ON h.code_pharmacie=p.code_pharmacie
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
LEFT JOIN villes as v ON v.id_ville=a.id_ville
GROUP BY 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  p.est_de_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut`,
      );

      const Resultatpharmacies = requete[0];
      let pharmacieFiltre = Resultatpharmacies;

      logger.debug(`Filtrage par adresse... adresse: ${adresse_utilisateur}`);
      if (adresse_utilisateur) {
        pharmacieFiltre = pharmacieFiltre.filter((pharmacie) => {
          return pharmacie.adresse_fournit
            .toLowerCase()
            .includes(adresse_utilisateur.toLowerCase());
        });
      }

      logger.debug(`Filtrage selon la plus proche...`);
      if (latitude && longitude) {
        const latitudeUtilisateur = degreesToRadians(latitude);
        const longitudeUtilisateur = degreesToRadians(longitude);

        pharmacieFiltre = pharmacieFiltre.filter((unePharma) => {
          const latitudePharmacie = degreesToRadians(unePharma.latitude);
          const longitudePharmacie = degreesToRadians(unePharma.longitude);

          const distanceEntre = distance(
            latitudeUtilisateur,
            longitudeUtilisateur,
            latitudePharmacie,
            longitudePharmacie,
          );

          return distanceEntre <= 1000;
        });
      }

      logger.debug(`Pharmacies récupérées avec succès!`);
      return {
        success: true,
        message:
          latitude && longitude
            ? "Liste des pharmacies dans un rayon 5KM"
            : "Liste des pharmacies",
        data: pharmacieFiltre.length !== 0 ? pharmacieFiltre : [],
      };
    } catch (error) {
      logger.error(
        `Erreur récupération des pharmacies... erreur: ${error.message}`,
      );
      console.log(error);
      return {
        success: false,
        message:
          "Aucune pharmacie trouvé dans cette zone et à l'adresse fourni",
      };
    } finally {
      connexion.release();
    }
  }
  //Rechercher une pharamcie
  static async rechercherPharmacie(terme_saisi, longitude, latitude) {
    const connexion = await dataBase.getConnection();

    logger.debug(`Recherche de pharmacie`);
    try {
      const requete = await connexion.query(
        `SELECT 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  GROUP_CONCAT(DISTINCT h.en_semaine SEPARATOR ', ') as horaire_semaine,
  GROUP_CONCAT(DISTINCT h.samedi SEPARATOR ', ') as horaire_samedi,
  GROUP_CONCAT(DISTINCT h.dimanche SEPARATOR ', ') as horaire_dimanche,
  p.est_de_garde as statut_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p
LEFT JOIN horaires_ouverture as h ON h.code_pharmacie=p.code_pharmacie
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
LEFT JOIN villes as v ON v.id_ville=a.id_ville
GROUP BY 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  p.est_de_garde,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut`,
      );

      const Resultatpharmacies = requete[0];
      let pharmacieFiltre = Resultatpharmacies;

      if (terme_saisi) {
        logger.debug(
          `Filtrage pour correspondance avec le terme saisi: ${terme_saisi}`,
        );
        pharmacieFiltre = pharmacieFiltre.filter((pharmacie) => {
          return (
            pharmacie.nom_pharmacie
              .toLowerCase()
              .includes(terme_saisi.toLowerCase()) ||
            pharmacie.assurances_acceptees
              ?.toLowerCase()
              .includes(terme_saisi.toLowerCase()) ||
            pharmacie.adresse_fournit
              ?.toLowerCase()
              .includes(terme_saisi.toLowerCase())
          );
        });
      }

      if (latitude && longitude) {
        logger.debug(
          `Filtrage par la position dans un rayon de 5Km... Coordonnées utilisateur: [latitude: ${latitude},longitude: ${longitude}]`,
        );
        const latitudeUtilisateur = degreesToRadians(latitude);
        const longitudeUtilisateur = degreesToRadians(longitude);

        pharmacieFiltre = pharmacieFiltre
          .map((unePharma) => {
            const latitudePharmacie = degreesToRadians(unePharma.latitude);
            const longitudePharmacie = degreesToRadians(unePharma.longitude);

            const distanceEntre = distance(
              latitudeUtilisateur,
              longitudeUtilisateur,
              latitudePharmacie,
              longitudePharmacie,
            );

            return {
              ...unePharma,
              distance: distanceEntre, // 👉 ajout ici
            };
          })
          .filter((p) => p.distance <= 5000);
      }

      logger.debug(`Recherche éffectuée avec succès!`);
      return {
        success: true,
        message:
          latitude && longitude
            ? "Liste des pharmacies dans un rayon 1KM"
            : "Liste des pharmacies triée selon votre position",
        data: pharmacieFiltre.length !== 0 ? pharmacieFiltre : [],
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la recherche de pharmacie erreur: ${error.message}`,
      );
      console.log(error);
      return {
        success: false,
        message:
          "Aucune pharmacie trouvé dans cette zone et à l'adresse fourni",
      };
    } finally {
      connexion.release();
    }
  }
  //Ajouter pharmacie
  static async ajouterPharmacie(
    code_gerant,
    nom_pharmacie,
    photo_pharmacie,
    numero_pharmacie,
    horaires_en_semaine,
    horaires_samedi,
    horaires_dimanche,
    latitude, // ✅ Paramètre renommé (était latitudePharmacie)
    longitude, // ✅ Paramètre renommé (était longitudePharmacie)
    ville_pharmacie,
    adresse_fournit,
    email_pharmacie,
    liste_assurance_accepte,
  ) {
    const connexion = await dataBase.getConnection();

    console.log("=== MODÈLE: PARAMÈTRES REÇUS ===");
    console.log("code_gerant:", code_gerant);
    console.log("nom_pharmacie:", nom_pharmacie);
    console.log("photo_pharmacie:", photo_pharmacie);
    console.log("numero_pharmacie:", numero_pharmacie);
    console.log("horaires_en_semaine:", horaires_en_semaine);
    console.log("horaires_samedi:", horaires_samedi);
    console.log("horaires_dimanche,:", horaires_dimanche);
    console.log("latitude:", latitude, "| Type:", typeof latitude);
    console.log("longitude:", longitude, "| Type:", typeof longitude);
    console.log("ville_pharmacie:", ville_pharmacie);
    console.log("adresse_fournit:", adresse_fournit);
    console.log("email_pharmacie:", email_pharmacie);
    console.log("liste_assurance_accepte:", liste_assurance_accepte);

    // ✅ Validation corrigée (accepte 0 pour latitude/longitude)
    if (
      !(
        code_gerant &&
        nom_pharmacie &&
        photo_pharmacie &&
        numero_pharmacie &&
        horaires_en_semaine &&
        horaires_samedi &&
        horaires_dimanche !== undefined &&
        latitude !== undefined && // ✅ Accepte 0
        longitude !== undefined && // ✅ Accepte 0
        ville_pharmacie &&
        email_pharmacie &&
        adresse_fournit &&
        Array.isArray(liste_assurance_accepte)
      )
    ) {
      logger.debug(`Echec de validation des champs`);

      // Debug: afficher les champs en échec
      const checks = {
        code_gerant: !!code_gerant,
        nom_pharmacie: !!nom_pharmacie,
        photo_pharmacie: !!photo_pharmacie,
        numero_pharmacie: !!numero_pharmacie,
        horaires_en_semaine: horaires_en_semaine,
        horaires_samedi: horaires_samedi,
        horaires_dimanche: horaires_dimanche !== undefined,
        latitude: latitude !== undefined,
        longitude: longitude !== undefined,
        ville_pharmacie: !!ville_pharmacie,
        email_pharmacie: !!email_pharmacie,
        adresse_fournit: !!adresse_fournit,
        liste_assurance_accepte: Array.isArray(liste_assurance_accepte),
      };
      logger.debug(`Validation détaillée: ${checks}`);

      const failedFields = Object.entries(checks)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      logger.debug(`Champs en échec: ${failedFields}`);

      connexion.release();
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
        failed_fields: failedFields,
      };
    }

    console.log("✅ VALIDATION RÉUSSIE");

    // ✅ Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_pharmacie)) {
      connexion.release();
      logger.debug(`Format d'email fournit incorrecte`);
      return {
        success: false,
        message: "Format d'email invalide",
      };
    }

    // ✅ Validation coordonnées GPS
    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      connexion.release();
      logger.debug(`Coordonnées GPS invalides`);
      return {
        success: false,
        message: "Coordonnées GPS invalides",
      };
    }

    await connexion.beginTransaction();

    try {
      console.log("✅ Transaction démarrée");
      logger.debug(`Ajout de la pharmacie...`);

      logger.debug(
        `Vérification de l'existance de l'utilisateur... => utilisateur: ${code_gerant}`,
      );
      // Vérifier l'existence de l'utilisateur gérant
      const [rowsUtilisateur] = await connexion.query(
        "SELECT * FROM utilisateurs WHERE code_utilisateur = ?",
        [code_gerant],
      );

      if (rowsUtilisateur.length === 0) {
        logger.debug(
          `Utilisateur introuvable il doit s'inscrire. utilisateur: ${code_gerant}`,
        );
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Utilisateur introuvable. Veuillez d'abord vous inscrire.",
        };
      }

      console.log("✅ Utilisateur trouvé");

      logger.debug(`Vérification s'il ne gère pas déjà une pharmacie...`);
      // Vérifier que l'utilisateur n'est pas déjà gérant
      const [rowsGerant] = await connexion.query(
        "SELECT * FROM utilisateur_gerant WHERE code_utilisateur = ? AND id_statut = 1",
        [code_gerant],
      );

      if (rowsGerant.length > 0) {
        logger.debug(`Utilisateur déjà gérant d'une pharmacie`);
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Vous êtes déjà gérant d'une pharmacie active.",
        };
      }

      logger.debug(`Vérification de l'existance d'une pharmacie de ce nom...`);
      // Vérifier doublon nom pharmacie
      const [rowsDoublon] = await connexion.query(
        "SELECT * FROM pharmacie WHERE nom_pharmacie = ? AND id_statut = 1",
        [nom_pharmacie],
      );

      if (rowsDoublon.length > 0) {
        logger.debug(
          `Une pharmacie avec ce nom existe déjà => pharmacie: ${rowsDoublon.nom_pharmacie}`,
        );
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Une pharmacie avec ce nom existe déjà.",
        };
      }
      logger.debug(`Vérification de doublon ok ✅`);

      console.log("✅ Vérifications passées");

      logger.debug(`Génération du code_pharmacie...`);
      // Générer le code pharmacie
      const code_pharma = this.genererCodePharmacie();

      logger.debug(`Code_pharmacie généré code_pharmacie: ${code_pharma}`);
      console.log("✅ Code pharmacie généré:", code_pharma);

      logger.debug(`Enregistrement de la pharmacie...`);

      logger.debug(`Enregistrement dans pharmacie...`);
      // Enregistrement dans pharmacies
      const [newPharma] = await connexion.query(
        `INSERT INTO pharmacie 
      (code_pharmacie, nom_pharmacie, photo_pharmacie, numeros_pharmacie, id_statut, email_pharmacie) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          code_pharma,
          nom_pharmacie,
          photo_pharmacie,
          numero_pharmacie,
          1,
          email_pharmacie,
        ],
      );

      if (newPharma.insertId == null) {
        throw new Exception("Erreur lors de l'enregistrement de la pharmacie");
      }
      logger.debug(`Pharmacie enregistrée`);

      logger.debug(`Enregistrement des horaires...`);
      //Enregistrer les horaires d'ouverture
      await connexion.query(
        "INSERT INTO horaires_ouverture(code_pharmacie, en_semaine,samedi,dimanche) VALUES(?,?,?,?)",
        [
          code_pharma,
          horaires_en_semaine ?? "Fermé",
          horaires_samedi ?? "Fermé",
          horaires_dimanche ?? "Fermé",
        ],
      );

      logger.debug(`Horaires enregistrées`);

      console.log("✅ Pharmacie insérée");

      logger.debug(`Vérification existance de la ville`);
      // Récupérer l'id_ville
      const [verifVille] = await connexion.query(
        "SELECT id_ville FROM villes WHERE nom_ville = ?",
        [ville_pharmacie],
      );

      let id_ville;
      if (verifVille.length > 0) {
        logger.debug(`La ville existe déjà`);
        id_ville = verifVille[0].id_ville;
        console.log("✅ Ville trouvée:", id_ville);
      } else {
        logger.debug(`La ville n'existe pas. Ajout...`);
        const [ajouterVille] = await connexion.query(
          "INSERT INTO villes (nom_ville) VALUES (?)",
          [ville_pharmacie],
        );
        id_ville = ajouterVille.insertId;
        logger.debug(`Ville ajoutée avec succès ! id_ville: ${id_ville}`);
        console.log("✅ Ville créée:", id_ville);
      }

      logger.debug(`Association de la ville à la pharmacie...`);
      // Insérer dans adresse_pharmacie
      const [resultAdresse] = await connexion.query(
        `INSERT INTO adresse_pharmacie 
      (code_pharmacie, latitude, longitude, adresse_fournit, id_ville) 
      VALUES (?, ?, ?, ?, ?)`,
        [code_pharma, latitude, longitude, adresse_fournit, id_ville],
      );

      console.log("✅ Adresse insérée");
      logger.debug(
        `Association de la ville à la pharmacie effectuée avec succès !`,
      );
      logger.debug(
        `Mise à jour de la table pharmacie avec la nouvelle adresse`,
      );
      // Mettre à jour l'id_adresse dans pharmacie
      await connexion.query(
        "UPDATE pharmacie SET id_adresse = ? WHERE code_pharmacie = ?",
        [resultAdresse.insertId, code_pharma],
      );

      console.log("✅ id_adresse mise à jour");

      let i = 0;
      // Ajouter les assurances acceptées
      for (const nomAssurance of liste_assurance_accepte) {
        const [rowsAssurance] = await connexion.query(
          "SELECT id_assurance FROM assurances WHERE nom_assurance = ?",
          [nomAssurance],
        );

        let id_assurance;
        if (rowsAssurance.length > 0) {
          logger.debug(`L'assurance ${nomAssurance} existe déjà dans la BD`);
          id_assurance = rowsAssurance[0].id_assurance;
        } else {
          logger.debug(
            `L'assurance ${nomAssurance} n'existe pas en BD donc ajout...`,
          );
          const [resultAssurance] = await connexion.query(
            "INSERT INTO assurances (nom_assurance, id_statut) VALUES (?, 1)",
            [nomAssurance],
          );
          id_assurance = resultAssurance.insertId;
          logger.debug(`Assurance ajoutée avec succès !`);
          console.log("✅ Assurance ajoutée:", nomAssurance);
          i += 1;
        }

        await connexion.query(
          "INSERT INTO pharmacie_assurance (code_pharmacie, id_assurance) VALUES (?, ?)",
          [code_pharma, id_assurance],
        );
      }
      logger.debug(`${i} nouvelles assurances ajoutée au système`);

      console.log("✅ Assurances ajoutées:", liste_assurance_accepte.length);

      logger.debug(
        `Enregistrement de l'utilisateur dans la table des gérants...`,
      );
      // Enregistrer le gérant de la pharmacie
      await connexion.query(
        "INSERT INTO utilisateur_gerant (code_utilisateur, code_pharmacie, id_statut) VALUES (?, ?, 1)",
        [code_gerant, code_pharma],
      );

      logger.debug(`Utilisateur ajouté avec succès!`);
      console.log("✅ Gérant enregistré");

      logger.debug(`Mise à jour du type utilisateur dans la table utilisateur`);
      // Mettre à jour le type utilisateur
      await connexion.query(
        "UPDATE utilisateurs SET id_type_utilisateur = 3 WHERE code_utilisateur = ?",
        [code_gerant],
      );

      logger.debug(
        `Type utilisateur mis à jour pour utilisateur: ${code_gerant}`,
      );

      console.log("✅ Type utilisateur mis à jour");

      // Valider toutes les opérations
      await connexion.commit();
      console.log("✅ Transaction validée");
      logger.debug(
        `Fin de toutes les transactions. Pharmacie ajoutée avec succès !`,
      );
      return {
        success: true,
        message: "Votre pharmacie a été enregistrée avec succès !",
        data: {
          code_pharmacie: code_pharma,
          nom_pharmacie: nom_pharmacie,
          photo_url: photo_pharmacie,
        },
      };
    } catch (error) {
      logger.error(
        `Erreur lors de l'ajout de la pharmacie. Erreur: ${error.message}`,
      );
      await connexion.rollback();
      console.error("❌ Erreur transaction:", error);
      console.error("Stack:", error.stack);
      return {
        success: false,
        message: "Impossible d'enregistrer cette pharmacie",
        error: error.message,
      };
    } finally {
      connexion.release();
      console.log("✅ Connexion relâchée");
    }
  }

  //Modifier infos pharmacie
  static async modifierPharmacie(
    code_pharmacie,
    nom_pharmacie,
    photo_pharmacie,
    numero_pharmacie,
    horaires_en_semaine,
    horaires_samedi,
    horaires_dimanche,
    latitude,
    longitude,
    ville_pharmacie,
    adresse_fournit,
    email_pharmacie,
    liste_assurance_accepte,
  ) {
    const connexion = await dataBase.getConnection();

    logger.debug(`Mise à jour du profil de la pharmacie...`);

    console.log("=== MODÈLE: MODIFICATION PHARMACIE ===");
    console.log("code_pharmacie:", code_pharmacie);
    console.log("nom_pharmacie:", nom_pharmacie);
    console.log("photo_pharmacie:", photo_pharmacie);
    console.log("numero_pharmacie:", numero_pharmacie);
    console.log("horaires_en_semaine:", horaires_en_semaine);
    console.log("horaires_samedi:", horaires_samedi);
    console.log("horaires_dimanche,:", horaires_dimanche);
    console.log("latitude:", latitude, "| Type:", typeof latitude);
    console.log("longitude:", longitude, "| Type:", typeof longitude);
    console.log("ville_pharmacie:", ville_pharmacie);
    console.log("adresse_fournit:", adresse_fournit);
    console.log("email_pharmacie:", email_pharmacie);
    console.log("liste_assurance_accepte:", liste_assurance_accepte);

    // ✅ Validation du code pharmacie (obligatoire)
    if (!code_pharmacie) {
      logger.debug(`Tentative de mise à jour sans code_pharmacie`);
      connexion.release();
      return {
        success: false,
        message: "Code pharmacie manquant",
      };
    }

    logger.debug(`Validation de l'email fournit...`);
    // ✅ Validation email si fourni
    if (email_pharmacie) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email_pharmacie)) {
        logger.debug(
          `Format de l'email fournit incorrecte email: ${email_pharmacie}`,
        );
        connexion.release();
        return {
          success: false,
          message: "Format d'email invalide",
        };
      }
    }
    logger.debug(`Email validé avec succès `);

    // ✅ Validation coordonnées GPS si fournies
    if (latitude !== undefined && longitude !== undefined) {
      logger.debug(`Validation des coordonnées GPS...`);
      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        logger.debug(
          `Coordonnées GPS invalides. Coordonnées: [latitude: ${latitude}, longitude: ${longitude}]`,
        );
        connexion.release();
        return {
          success: false,
          message: "Coordonnées GPS invalides",
        };
      }
    }

    await connexion.beginTransaction();

    try {
      console.log("✅ Transaction démarrée");

      logger.debug(`Verifier que la pharmacie existe déjà`);

      // ✅ Vérifier que la pharmacie existe
      const [rowsPharmacie] = await connexion.query(
        "SELECT * FROM pharmacie WHERE code_pharmacie = ?",
        [code_pharmacie],
      );

      if (rowsPharmacie.length === 0) {
        logger.debug(`Pharmacie inexistante`);
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Pharmacie introuvable",
        };
      }

      console.log("✅ Pharmacie trouvée");

      const pharmacieActuelle = rowsPharmacie[0];

      // ✅ 1. MISE À JOUR TABLE PHARMACIE
      const updateFieldsPharmacie = [];
      const updateValuesPharmacie = [];

      if (nom_pharmacie) {
        logger.debug(`Vérifier les doublon de nom`);
        // Vérifier doublon nom (sauf pour cette pharmacie)
        const [rowsDoublon] = await connexion.query(
          "SELECT * FROM pharmacie WHERE nom_pharmacie = ? AND code_pharmacie != ? AND id_statut = 1",
          [nom_pharmacie, code_pharmacie],
        );

        if (rowsDoublon.length > 0) {
          logger.debug(`Une pharmacie existe déjà avec ce nom`);
          await connexion.rollback();
          connexion.release();
          return {
            success: false,
            message: "Une autre pharmacie avec ce nom existe déjà.",
          };
        }

        updateFieldsPharmacie.push("nom_pharmacie = ?");
        updateValuesPharmacie.push(nom_pharmacie);
      }

      if (photo_pharmacie) {
        logger.debug(`Mise à jour avec une nouvelle photo`);
        updateFieldsPharmacie.push("photo_pharmacie = ?");
        updateValuesPharmacie.push(photo_pharmacie);
      }

      if (numero_pharmacie) {
        logger.debug(`Mise à jour avec un nouveau numéro`);
        updateFieldsPharmacie.push("numeros_pharmacie = ?");
        updateValuesPharmacie.push(numero_pharmacie);
      }

      if (email_pharmacie) {
        logger.debug(`Mise à jour avec une nouvelle adresse email`);
        updateFieldsPharmacie.push("email_pharmacie = ?");
        updateValuesPharmacie.push(email_pharmacie);
      }

      logger.debug(`Mise à jour de tous les champs qui ont changés`);
      // Mettre à jour la pharmacie si des champs ont changé
      if (updateFieldsPharmacie.length > 0) {
        updateValuesPharmacie.push(code_pharmacie);

        const updateQueryPharmacie = `
        UPDATE pharmacie 
        SET ${updateFieldsPharmacie.join(", ")}
        WHERE code_pharmacie = ?
      `;

        console.log("Update query pharmacie:", updateQueryPharmacie);
        console.log("Values:", updateValuesPharmacie);

        await connexion.query(updateQueryPharmacie, updateValuesPharmacie);
        console.log("✅ Table pharmacie mise à jour");
      }

      //Mise à jour horaires pharmacie
      if (horaires_en_semaine || horaires_samedi || horaires_dimanche) {
        logger.debug(`Mise à jour avec de nouveaux horaires d'ouverture`);
        const code_pharma = pharmacieActuelle.code_pharmacie;
        if (code_pharma) {
          await connexion.query(
            "UPDATE horaires_ouverture SET en_semaine=?, samedi=?, dimanche=? WHERE code_pharmacie=?",
            [
              horaires_en_semaine ?? "Fermée",
              horaires_samedi ?? "Fermée",
              horaires_dimanche ?? "Fermée",
              code_pharma,
            ],
          );
        }
      }

      // ✅ 2. MISE À JOUR ADRESSE
      if (
        adresse_fournit ||
        ville_pharmacie ||
        latitude !== undefined ||
        longitude !== undefined
      ) {
        logger.debug(`Mise à jour avec une nouvelle adresse et coordonnées`);
        const id_adresse = pharmacieActuelle.id_adresse;

        if (id_adresse) {
          const updateFieldsAdresse = [];
          const updateValuesAdresse = [];

          if (adresse_fournit) {
            logger.debug(`Mise à jour avec une nouvelle adresse`);
            updateFieldsAdresse.push("adresse_fournit = ?");
            updateValuesAdresse.push(adresse_fournit);
          }

          if (latitude !== undefined) {
            logger.debug(`Mise à jour avec une nouvelle latitude`);
            updateFieldsAdresse.push("latitude = ?");
            updateValuesAdresse.push(latitude);
          }

          if (longitude !== undefined) {
            logger.debug(`Mise à jour avec une nouvelle longitude`);
            updateFieldsAdresse.push("longitude = ?");
            updateValuesAdresse.push(longitude);
          }

          if (ville_pharmacie) {
            logger.debug(`Mise à jour avec une nouvelle ville`);
            // Récupérer ou créer la ville
            const [verifVille] = await connexion.query(
              "SELECT id_ville FROM villes WHERE nom_ville = ?",
              [ville_pharmacie],
            );

            let id_ville;
            if (verifVille.length > 0) {
              id_ville = verifVille[0].id_ville;
              console.log("✅ Ville trouvée:", id_ville);

              logger.debug(`Nouvelle ville existe déjà dans la BD`);
            } else {
              logger.debug(`Nouvelle ville n'existe pas donc ajout...`);
              const [ajouterVille] = await connexion.query(
                "INSERT INTO villes (nom_ville) VALUES (?)",
                [ville_pharmacie],
              );
              id_ville = ajouterVille.insertId;
              console.log("✅ Ville créée:", id_ville);

              logger.debug(`Nouvelle ville ajoutée avec succès !`);
            }

            updateFieldsAdresse.push("id_ville = ?");
            updateValuesAdresse.push(id_ville);
          }

          if (updateFieldsAdresse.length > 0) {
            updateValuesAdresse.push(id_adresse);

            const updateQueryAdresse = `
            UPDATE adresse_pharmacie 
            SET ${updateFieldsAdresse.join(", ")}
            WHERE id_adresse = ?
          `;

            console.log("Update query adresse:", updateQueryAdresse);
            console.log("Values:", updateValuesAdresse);

            await connexion.query(updateQueryAdresse, updateValuesAdresse);
            console.log("✅ Adresse mise à jour");
          }
        } else {
          console.log("⚠️ Pas d'adresse existante");
        }
      }

      // ✅ 3. MISE À JOUR ASSURANCES
      if (liste_assurance_accepte && Array.isArray(liste_assurance_accepte)) {
        console.log("=== MISE À JOUR ASSURANCES ===");

        logger.debug(`Mise à jour des nouvelles assurances acceptées...`);

        logger.debug(
          `Suppression des anciennces associations assurances_acceptées...`,
        );
        // Supprimer les anciennes associations
        await connexion.query(
          "DELETE FROM pharmacie_assurance WHERE code_pharmacie = ?",
          [code_pharmacie],
        );

        logger.debug(`Ancienne assurances supprimées avec succès !`);
        console.log("✅ Anciennes assurances supprimées");

        logger.debug(`Ajout des nouvelles assurances...`);
        let i = 0;
        // Ajouter les nouvelles
        for (const nomAssurance of liste_assurance_accepte) {
          logger.debug(`Vérification que l'assurance existe en BD`);
          const [rowsAssurance] = await connexion.query(
            "SELECT id_assurance FROM assurances WHERE nom_assurance = ?",
            [nomAssurance],
          );

          let id_assurance;
          if (rowsAssurance.length > 0) {
            logger.debug(
              `Assurance ${nomAssurance} existe déjà en BD. ID récupéré`,
            );
            id_assurance = rowsAssurance[0].id_assurance;
          } else {
            logger.debug(
              `Assurance ${nomAssurance} n'existe pas déjà en BD. Ajout...`,
            );
            const [resultAssurance] = await connexion.query(
              "INSERT INTO assurances (nom_assurance, id_statut) VALUES (?, 1)",
              [nomAssurance],
            );
            id_assurance = resultAssurance.insertId;
            logger.debug(`Assurance ${nomAssurance} ajoutée avec succès !`);
          }

          logger.debug(
            `Enregistrement de l'assurance ${nomAssurance} dans la liste...`,
          );
          await connexion.query(
            "INSERT INTO pharmacie_assurance (code_pharmacie, id_assurance) VALUES (?, ?)",
            [code_pharmacie, id_assurance],
          );
          logger.debug(`Assurance ${nomAssurance}enregistré avec succès !`);
          i += 1;
        }
        logger.debug(
          `Assurance ajoutée ${i}/${liste_assurance_accepte.length} avec succès`,
        );

        console.log(
          "✅ Assurances mises à jour:",
          liste_assurance_accepte.length,
        );
      }

      // ✅ Valider la transaction
      await connexion.commit();
      console.log("✅ Transaction validée");
      logger.debug(
        `Mise à jour profil pharmacie éffectuée avec succès  pour pharmacie: ${code_pharmacie}`,
      );

      return {
        success: true,
        message: "Pharmacie modifiée avec succès !",
        data: {
          code_pharmacie: code_pharmacie,
          nom_pharmacie: nom_pharmacie || pharmacieActuelle.nom_pharmacie,
          photo_url: photo_pharmacie || pharmacieActuelle.photo_pharmacie,
        },
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la mise à jour du profil de la pharmacie ${code_pharmacie}`,
      );
      await connexion.rollback();
      console.error("❌ Erreur transaction:", error);
      console.error("Stack:", error.stack);
      return {
        success: false,
        message: "Impossible de modifier cette pharmacie",
        error: error.message,
      };
    } finally {
      connexion.release();
      console.log("✅ Connexion relâchée");
    }
  }

  //Récupérer les statistiques la pharmacie
  static async recupererStatistiques(code_pharmacie) {
    const connexion = await dataBase.getConnection();

    try {
      //Vérifier l'existance de la pharmacie
      const req1 = await connexion.query(
        "SELECT code_pharmacie FROM pharmacie WHERE code_pharmacie=?",
        [code_pharmacie],
      );
      const pharma = req1[0][0].code_pharmacie;

      if (!pharma) {
        return {
          success: false,
          message: "Aucune pharmacie ne correspond à ce code",
        };
      }

      // 1. Statistiques de base
      const [statsBase] = await connexion.query(
        `
      SELECT 
        (SELECT COUNT(*) FROM vues_pharmacie WHERE code_pharmacie = ?) as total_vues,
        (SELECT COUNT(*) FROM newsletter WHERE code_pharmacie = ? AND id_statut = 1) as total_abonnes,
        (SELECT COUNT(*) FROM annonce WHERE code_pharmacie = ? AND id_statut = 1) as annonces_actives,
        (SELECT COUNT(*) FROM newsletter WHERE code_pharmacie = ?) as newsletters_envoyees
    `,
        [code_pharmacie, code_pharmacie, code_pharmacie, code_pharmacie],
      );

      // 2. Vues par jour (7 derniers jours)
      const [vuesParJour] = await connexion.query(
        `
      SELECT 
        DATE(date_vue) as date,
        COUNT(*) as nb_vues
      FROM vues_pharmacie
      WHERE code_pharmacie = ?
        AND date_vue >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(date_vue)
      ORDER BY date
    `,
        [code_pharmacie],
      );

      // 3. Évolution abonnés (6 derniers mois)
      const [evolutionAbonnes] = await connexion.query(
        `
      SELECT 
        DATE_FORMAT(date_abonnement, '%Y-%m') as mois,
        COUNT(*) as nouveaux_abonnes
      FROM newsletter
      WHERE code_pharmacie = ?
        AND date_abonnement >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date_abonnement, '%Y-%m')
      ORDER BY mois
    `,
        [code_pharmacie],
      );

      // 5. Assurances acceptées
      const [assurances] = await connexion.query(
        `
      SELECT 
        ass.nom_assurance,
        ass.id_assurance
      FROM pharmacie_assurance pa
      INNER JOIN assurances ass ON pa.id_assurance = ass.id_assurance
      WHERE pa.code_pharmacie = ?
    `,
        [code_pharmacie],
      );

      return {
        stats_base: statsBase[0],
        vues_par_jour: vuesParJour,
        evolution_abonnes: evolutionAbonnes,
        top_annonces: topAnnonces,
        assurances: assurances,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des statistique de la pharmacie ${code_pharmacie} erreur: ${error.message}`,
      );
      console.log(error);
      connexion.release();
    } finally {
      connexion.release();
    }
  }

  //Mettre à jour statut de garde
  static async mettreAJourStatutGarde(code_pharmacie, est_de_garde) {
    const connexion = await dataBase.getConnection();

    try {
      logger.debug(`Mise à jour du statut de garde`);
      logger.debug(`Nouveau statut:
        ${est_de_garde ? "DE GARDE" : "PAS DE GARDE"},
      `);

      // ✅ Simple UPDATE - C'est tout !
      const [result] = await connexion.query(
        `
      UPDATE pharmacie 
      SET est_de_garde = ?,
          derniere_maj_garde = NOW()
      WHERE code_pharmacie = ?
    `,
        [est_de_garde, code_pharmacie],
      );

      if (result.affectedRows === 0) {
        logger.debug(`Pharmacie introuvable code_pharmacie: ${code_pharmacie}`);
        return {
          success: false,
          message: "Pharmacie introuvable",
        };
      }
      logger.debug(
        `Récupération des infos de la pharmacie ainsi que le fcm_token des abonnés`,
      );
      // Récupérer tous les abonnés de la pharmacie et son nom
      const [infos] = await connexion.query(
        `SELECT 
    u.fcm_tokens as token,
    p.nom_pharmacie 
   FROM utilisateurs u 
   INNER JOIN newsletter as n ON n.code_utilisateur = u.code_utilisateur 
   INNER JOIN pharmacie as p ON p.code_pharmacie = n.code_pharmacie 
   WHERE n.code_pharmacie = ? 
   AND u.fcm_tokens IS NOT NULL`,
        [code_pharmacie],
      );

      if (infos.length > 0) {
        const nomPharmacie = infos[0].nom_pharmacie; // ✅ Récupérer le nom une seule fois

        logger.debug(`Envoie des notifications aux différents abonné...`);
        for (const info of infos) {
          // ✅ "of" au lieu de "in"
          console.log("Envoi notification à:", info.token);

          const notificationData = {
            titre: "Mise à jour statut de garde",
            message: est_de_garde
              ? `La pharmacie ${nomPharmacie} est actuellement de garde`
              : `La pharmacie ${nomPharmacie} n'est plus de garde`,
            type: "Information",
          };

          await notificationPush.envoyerNotificationUnique(
            notificationData,
            info.token,
          );
        }

        logger.debug(`✅ ${infos.length} notification(s) envoyée(s)`);
      }
      logger.debug(
        `${est_de_garde ? "Pharmacie marquée comme de garde" : "Pharmacie marquée comme n'étant plus de garde"}`,
      );
      return {
        success: true,
        message: est_de_garde
          ? "Pharmacie marquée comme étant de garde"
          : "Pharmacie marquée comme n'étant plus de garde",
        est_de_garde: est_de_garde,
        derniere_maj: new Date(),
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la mise à jour du statut de garde erreur: ${error.message}`,
      );
      console.error("❌ Erreur mettreAJourStatutGarde:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour",
        error: error.message,
      };
    } finally {
      connexion.release();
    }
  }
}

module.exports = Pharmacie;
