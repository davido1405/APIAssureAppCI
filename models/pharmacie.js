const dataBase = require("../config/db_config.js");

const { degreesToRadians, distance } = require("../utils/calculdistances.js");

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
    try {
      const requete = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=? AND id_statut=?",
        [code_gerant, 1],
      );
      const code_pharma = requete[0][0]?.code_pharmacie;

      if (!code_pharma) {
        return {
          success: false,
          message: "Aucune pharmacie trouvé",
        };
      }
      //Récupérer maintenant le profil de la pharmacie
      const requete2 = await connexion.query(
        `SELECT 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.horraires_ouverture,
  p.email_pharmacie,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p 
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN villes as v ON v.id_ville = a.id_ville 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
WHERE p.code_pharmacie = ?
GROUP BY 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.horraires_ouverture,
  p.email_pharmacie,
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut`,
        [code_pharma],
      );
      const profilPharma = requete2[0][0];

      return {
        success: true,
        message: "Profil de la pharmacie récupéré avec succès !",
        data: profilPharma,
      };
    } catch (error) {
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
    if (!codePharmacie || !Array.isArray(liste_assurance)) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }

    const connexion = await dataBase.getConnection();
    try {
      await connexion.beginTransaction();
      for (const assurance of liste_assurance) {
        const requete = await connexion.query(
          "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
          [assurance],
        );
        let id_assurance = requete[0][0]?.id_assurance;
        if (!id_assurance) {
          const requete2 = await connexion.query(
            "INSERT INTO assurances(nom_assurance)VALUES(?)",
            [assurance],
          );
          id_assurance = requete2[0].insertId;
        }
        //Enregistrement de l'assurance
        const requete3 = await connexion.query(
          "INSERT INTO pharmacie_assurance(code_pharmacie,id_assurance) VALUES (?,?)",
          [codePharmacie, id_assurance],
        );
      }

      connexion.commit();

      return {
        success: true,
        message:
          "Assurance ajoutée à la liste des assurances prises en charge avec succès !",
      };
    } catch (error) {
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

    try {
      const requete = await connexion.query(
        `SELECT 
  p.code_pharmacie,
  p.nom_pharmacie,
  p.photo_pharmacie,
  p.numeros_pharmacie,
  p.email_pharmacie,
  p.horraires_ouverture,
  p.est_de_garde as statut_garde
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  v.nom_ville,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p 
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
LEFT JOIN villes as v ON v.id_ville=a.id_ville
GROUP BY p.code_pharmacie`,
      );

      const Resultatpharmacies = requete[0];
      let pharmacieFiltre = Resultatpharmacies;

      if (adresse_utilisateur) {
        pharmacieFiltre = pharmacieFiltre.filter((pharmacie) => {
          return pharmacie.adresse_fournit
            .toLowerCase()
            .includes(adresse_utilisateur.toLowerCase());
        });
      }

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

      return {
        success: true,
        message:
          latitude && longitude
            ? "Liste des pharmacies dans un rayon 1KM"
            : "Liste des pharmacies",
        data: pharmacieFiltre.length !== 0 ? pharmacieFiltre : [],
      };
    } catch (error) {
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

    try {
      const requete = await connexion.query(
        `SELECT 
        p.code_pharmacie,
        p.nom_pharmacie,
        p.photo_pharmacie,
        p.numeros_pharmacie,
        p.email_pharmacie,
        p.horraires_ouverture,
  p.est_de_garde as statut_garde
        a.longitude,
        a.latitude,
        a.adresse_fournit,
        v.nom_ville,
        s.libelle_statut,
        GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
      FROM pharmacie as p 
      INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
      INNER JOIN statut as s ON s.id_statut = p.id_statut
      LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
      LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
      LEFT JOIN villes as v ON v.id_ville=a.id_ville
      GROUP BY p.code_pharmacie`,
      );

      const Resultatpharmacies = requete[0];
      let pharmacieFiltre = Resultatpharmacies;

      if (terme_saisi) {
        pharmacieFiltre = pharmacieFiltre.filter((pharmacie) => {
          return (
            pharmacie.nom_pharmacie
              .toLowerCase()
              .includes(terme_saisi.toLowerCase()) ||
            pharmacie.assurances_acceptees
              ?.toLowerCase()
              .includes(terme_saisi.toLowerCase())
          );
        });
      }

      if (latitude && longitude) {
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
          .filter((p) => p.distance <= 1000);
      }

      return {
        success: true,
        message:
          latitude && longitude
            ? "Liste des pharmacies dans un rayon 1KM"
            : "Liste des pharmacies triée selon votre position",
        data: pharmacieFiltre.length !== 0 ? pharmacieFiltre : [],
      };
    } catch (error) {
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
  static async ajouterPharmacie(
    code_gerant,
    nom_pharmacie,
    photo_pharmacie,
    numero_pharmacie,
    horraires_ouverture,
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
    console.log("horraires_ouverture:", horraires_ouverture);
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
        horraires_ouverture &&
        latitude !== undefined && // ✅ Accepte 0
        longitude !== undefined && // ✅ Accepte 0
        ville_pharmacie &&
        email_pharmacie &&
        adresse_fournit &&
        Array.isArray(liste_assurance_accepte)
      )
    ) {
      console.log("❌ VALIDATION ÉCHOUÉE");

      // Debug: afficher les champs en échec
      const checks = {
        code_gerant: !!code_gerant,
        nom_pharmacie: !!nom_pharmacie,
        photo_pharmacie: !!photo_pharmacie,
        numero_pharmacie: !!numero_pharmacie,
        horraires_ouverture: !!horraires_ouverture,
        latitude: latitude !== undefined,
        longitude: longitude !== undefined,
        ville_pharmacie: !!ville_pharmacie,
        email_pharmacie: !!email_pharmacie,
        adresse_fournit: !!adresse_fournit,
        liste_assurance_accepte: Array.isArray(liste_assurance_accepte),
      };

      console.log("Validation détaillée:", checks);

      const failedFields = Object.entries(checks)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      console.log("Champs en échec:", failedFields);

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
      return {
        success: false,
        message: "Coordonnées GPS invalides",
      };
    }

    await connexion.beginTransaction();

    try {
      console.log("✅ Transaction démarrée");

      // Vérifier l'existence de l'utilisateur gérant
      const [rowsUtilisateur] = await connexion.query(
        "SELECT * FROM utilisateurs WHERE code_utilisateur = ?",
        [code_gerant],
      );

      if (rowsUtilisateur.length === 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Utilisateur introuvable. Veuillez d'abord vous inscrire.",
        };
      }

      console.log("✅ Utilisateur trouvé");

      // Vérifier que l'utilisateur n'est pas déjà gérant
      const [rowsGerant] = await connexion.query(
        "SELECT * FROM utilisateur_gerant WHERE code_utilisateur = ? AND id_statut = 1",
        [code_gerant],
      );

      if (rowsGerant.length > 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Vous êtes déjà gérant d'une pharmacie active.",
        };
      }

      // Vérifier doublon nom pharmacie
      const [rowsDoublon] = await connexion.query(
        "SELECT * FROM pharmacie WHERE nom_pharmacie = ? AND id_statut = 1",
        [nom_pharmacie],
      );

      if (rowsDoublon.length > 0) {
        await connexion.rollback();
        connexion.release();
        return {
          success: false,
          message: "Une pharmacie avec ce nom existe déjà.",
        };
      }

      console.log("✅ Vérifications passées");

      // Générer le code pharmacie
      const code_pharma = this.genererCodePharmacie();
      console.log("✅ Code pharmacie généré:", code_pharma);

      // Enregistrement dans pharmacies
      await connexion.query(
        `INSERT INTO pharmacie 
      (code_pharmacie, nom_pharmacie, photo_pharmacie, numeros_pharmacie, 
       horraires_ouverture, id_statut, email_pharmacie) 
      VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [
          code_pharma,
          nom_pharmacie,
          photo_pharmacie,
          numero_pharmacie,
          horraires_ouverture,
          email_pharmacie,
        ],
      );

      console.log("✅ Pharmacie insérée");

      // Récupérer l'id_ville
      const [verifVille] = await connexion.query(
        "SELECT id_ville FROM villes WHERE nom_ville = ?",
        [ville_pharmacie],
      );

      let id_ville;
      if (verifVille.length > 0) {
        id_ville = verifVille[0].id_ville;
        console.log("✅ Ville trouvée:", id_ville);
      } else {
        const [ajouterVille] = await connexion.query(
          "INSERT INTO villes (nom_ville) VALUES (?)",
          [ville_pharmacie],
        );
        id_ville = ajouterVille.insertId;
        console.log("✅ Ville créée:", id_ville);
      }

      // Insérer dans adresse_pharmacie
      const [resultAdresse] = await connexion.query(
        `INSERT INTO adresse_pharmacie 
      (code_pharmacie, latitude, longitude, adresse_fournit, id_ville) 
      VALUES (?, ?, ?, ?, ?)`,
        [code_pharma, latitude, longitude, adresse_fournit, id_ville],
      );

      console.log("✅ Adresse insérée");

      // Mettre à jour l'id_adresse dans pharmacie
      await connexion.query(
        "UPDATE pharmacie SET id_adresse = ? WHERE code_pharmacie = ?",
        [resultAdresse.insertId, code_pharma],
      );

      console.log("✅ id_adresse mise à jour");

      // Ajouter les assurances acceptées
      for (const nomAssurance of liste_assurance_accepte) {
        const [rowsAssurance] = await connexion.query(
          "SELECT id_assurance FROM assurances WHERE nom_assurance = ?",
          [nomAssurance],
        );

        let id_assurance;
        if (rowsAssurance.length > 0) {
          id_assurance = rowsAssurance[0].id_assurance;
        } else {
          const [resultAssurance] = await connexion.query(
            "INSERT INTO assurances (nom_assurance, id_statut) VALUES (?, 1)",
            [nomAssurance],
          );
          id_assurance = resultAssurance.insertId;
          console.log("✅ Assurance créée:", nomAssurance);
        }

        await connexion.query(
          "INSERT INTO pharmacie_assurance (code_pharmacie, id_assurance) VALUES (?, ?)",
          [code_pharma, id_assurance],
        );
      }

      console.log("✅ Assurances ajoutées:", liste_assurance_accepte.length);

      // Enregistrer le gérant de la pharmacie
      await connexion.query(
        "INSERT INTO utilisateur_gerant (code_utilisateur, code_pharmacie, id_statut) VALUES (?, ?, 1)",
        [code_gerant, code_pharma],
      );

      console.log("✅ Gérant enregistré");

      // Mettre à jour le type utilisateur
      await connexion.query(
        "UPDATE utilisateurs SET id_type_utilisateur = 3 WHERE code_utilisateur = ?",
        [code_gerant],
      );

      console.log("✅ Type utilisateur mis à jour");

      // Valider toutes les opérations
      await connexion.commit();
      console.log("✅ Transaction validée");

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
    horraires_ouverture,
    latitude,
    longitude,
    ville_pharmacie,
    adresse_fournit,
    email_pharmacie,
    liste_assurance_accepte,
  ) {
    const connexion = await dataBase.getConnection();

    console.log("=== MODÈLE: MODIFICATION PHARMACIE ===");
    console.log("code_pharmacie:", code_pharmacie);
    console.log("nom_pharmacie:", nom_pharmacie);
    console.log("photo_pharmacie:", photo_pharmacie);
    console.log("numero_pharmacie:", numero_pharmacie);
    console.log("horraires_ouverture:", horraires_ouverture);
    console.log("latitude:", latitude, "| Type:", typeof latitude);
    console.log("longitude:", longitude, "| Type:", typeof longitude);
    console.log("ville_pharmacie:", ville_pharmacie);
    console.log("adresse_fournit:", adresse_fournit);
    console.log("email_pharmacie:", email_pharmacie);
    console.log("liste_assurance_accepte:", liste_assurance_accepte);

    // ✅ Validation du code pharmacie (obligatoire)
    if (!code_pharmacie) {
      connexion.release();
      return {
        success: false,
        message: "Code pharmacie manquant",
      };
    }

    // ✅ Validation email si fourni
    if (email_pharmacie) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email_pharmacie)) {
        connexion.release();
        return {
          success: false,
          message: "Format d'email invalide",
        };
      }
    }

    // ✅ Validation coordonnées GPS si fournies
    if (latitude !== undefined && longitude !== undefined) {
      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
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

      // ✅ Vérifier que la pharmacie existe
      const [rowsPharmacie] = await connexion.query(
        "SELECT * FROM pharmacie WHERE code_pharmacie = ?",
        [code_pharmacie],
      );

      if (rowsPharmacie.length === 0) {
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
        // Vérifier doublon nom (sauf pour cette pharmacie)
        const [rowsDoublon] = await connexion.query(
          "SELECT * FROM pharmacie WHERE nom_pharmacie = ? AND code_pharmacie != ? AND id_statut = 1",
          [nom_pharmacie, code_pharmacie],
        );

        if (rowsDoublon.length > 0) {
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
        updateFieldsPharmacie.push("photo_pharmacie = ?");
        updateValuesPharmacie.push(photo_pharmacie);
      }

      if (numero_pharmacie) {
        updateFieldsPharmacie.push("numeros_pharmacie = ?");
        updateValuesPharmacie.push(numero_pharmacie);
      }

      if (horraires_ouverture) {
        updateFieldsPharmacie.push("horraires_ouverture = ?");
        updateValuesPharmacie.push(horraires_ouverture);
      }

      if (email_pharmacie) {
        updateFieldsPharmacie.push("email_pharmacie = ?");
        updateValuesPharmacie.push(email_pharmacie);
      }

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

      // ✅ 2. MISE À JOUR ADRESSE
      if (
        adresse_fournit ||
        ville_pharmacie ||
        latitude !== undefined ||
        longitude !== undefined
      ) {
        const id_adresse = pharmacieActuelle.id_adresse;

        if (id_adresse) {
          const updateFieldsAdresse = [];
          const updateValuesAdresse = [];

          if (adresse_fournit) {
            updateFieldsAdresse.push("adresse_fournit = ?");
            updateValuesAdresse.push(adresse_fournit);
          }

          if (latitude !== undefined) {
            updateFieldsAdresse.push("latitude = ?");
            updateValuesAdresse.push(latitude);
          }

          if (longitude !== undefined) {
            updateFieldsAdresse.push("longitude = ?");
            updateValuesAdresse.push(longitude);
          }

          if (ville_pharmacie) {
            // Récupérer ou créer la ville
            const [verifVille] = await connexion.query(
              "SELECT id_ville FROM villes WHERE nom_ville = ?",
              [ville_pharmacie],
            );

            let id_ville;
            if (verifVille.length > 0) {
              id_ville = verifVille[0].id_ville;
              console.log("✅ Ville trouvée:", id_ville);
            } else {
              const [ajouterVille] = await connexion.query(
                "INSERT INTO villes (nom_ville) VALUES (?)",
                [ville_pharmacie],
              );
              id_ville = ajouterVille.insertId;
              console.log("✅ Ville créée:", id_ville);
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

        // Supprimer les anciennes associations
        await connexion.query(
          "DELETE FROM pharmacie_assurance WHERE code_pharmacie = ?",
          [code_pharmacie],
        );

        console.log("✅ Anciennes assurances supprimées");

        // Ajouter les nouvelles
        for (const nomAssurance of liste_assurance_accepte) {
          const [rowsAssurance] = await connexion.query(
            "SELECT id_assurance FROM assurances WHERE nom_assurance = ?",
            [nomAssurance],
          );

          let id_assurance;
          if (rowsAssurance.length > 0) {
            id_assurance = rowsAssurance[0].id_assurance;
          } else {
            const [resultAssurance] = await connexion.query(
              "INSERT INTO assurances (nom_assurance, id_statut) VALUES (?, 1)",
              [nomAssurance],
            );
            id_assurance = resultAssurance.insertId;
            console.log("✅ Assurance créée:", nomAssurance);
          }

          await connexion.query(
            "INSERT INTO pharmacie_assurance (code_pharmacie, id_assurance) VALUES (?, ?)",
            [code_pharmacie, id_assurance],
          );
        }

        console.log(
          "✅ Assurances mises à jour:",
          liste_assurance_accepte.length,
        );
      }

      // ✅ Valider la transaction
      await connexion.commit();
      console.log("✅ Transaction validée");

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

  static async recupererStatistiques(code_pharmacie) {
    const connexion = dataBase.getConnection();

    try {
      //Vérifier l'existance de la pharmacie
      const req1 = (await connexion).query(
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
      console.log(error);
    }
  }

  static async mettreAJourStatutGarde(code_pharmacie, est_de_garde) {
    const connexion = await dataBase.getConnection();

    try {
      console.log("=== MISE À JOUR STATUT DE GARDE ===");
      console.log("Code pharmacie:", code_pharmacie);
      console.log(
        "Nouveau statut:",
        est_de_garde ? "DE GARDE" : "PAS DE GARDE",
      );

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
        return {
          success: false,
          message: "Pharmacie introuvable",
        };
      }

      return {
        success: true,
        message: est_de_garde
          ? "Pharmacie marquée comme étant de garde"
          : "Pharmacie marquée comme n'étant plus de garde",
        est_de_garde: est_de_garde,
        derniere_maj: new Date(),
      };
    } catch (error) {
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
