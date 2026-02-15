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
  static async profilPharmacie(codeUtilisateur) {
    const connexion = await dataBase.getConnection();
    try {
      const requete = await connexion.query(
        "SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur=? AND id_statut=?",
        [codeUtilisateur, 1],
      );
      const code_pharma = requete[0][0]?.code_pharmacie;
      //Récupérer maintenant le profil de la pharmacie
      const requete2 = await connexion.query(
        "SELECT p.code_pharmacie,p.nom_pharmacie,p.photo_pharmacie,p.numeros_pharmacie,p.email_pharmacie, a.longitude,a.latitude,a.adresse_frounit,s.libelle_statut FROM pharmacie as p INNER JOIN adresse_pharmacie as a ON a.code_pharmacie=p.code_pharmacie INNER JOIN statut as s ON s.id_statut=p.id_statut WHERE p.code_pharmacie=?",
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
  static async ajouterAssurance(codePharmacie, nomAssurance) {
    const connexion = await dataBase.getConnection();
    try {
      await connexion.beginTransaction();
      const requete = await connexion.query(
        "SELECT id_assurance FROM assurance WHERE nom_assurance=?",
        [nomAssurance],
      );
      let id_assurance = requete[0][0]?.id_assurance;
      if (!id_assurance) {
        const requete2 = await connexion.query(
          "INSERT INTO assurance(nom_assurance)VALUES(?)",
          [nomAssurance],
        );
        id_assurance = requete2.insertId;
      }
      //Enregistrement de l'assurance
      const requete3 = await connexion.query(
        "INSERT INTO pharmacie_assurance(code_pharmacie,id_assurance) VALUES (?,?)",
        [codePharmacie, id_assurance],
      );

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
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p 
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
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
  //Rechercher une pharamcie
  static async rechercherPharmacie(
    nom_assurance,
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
  a.longitude,
  a.latitude,
  a.adresse_fournit,
  s.libelle_statut,
  GROUP_CONCAT(ass.nom_assurance SEPARATOR ', ') as assurances_acceptees
FROM pharmacie as p 
INNER JOIN adresse_pharmacie as a ON a.code_pharmacie = p.code_pharmacie 
INNER JOIN statut as s ON s.id_statut = p.id_statut
LEFT JOIN pharmacie_assurance as pa ON pa.code_pharmacie = p.code_pharmacie
LEFT JOIN assurances as ass ON ass.id_assurance = pa.id_assurance
GROUP BY p.code_pharmacie`,
      );

      const Resultatpharmacies = requete[0];
      let pharmacieFiltre = Resultatpharmacies;

      if (adresse_utilisateur || nom_assurance) {
        pharmacieFiltre = pharmacieFiltre.filter((pharmacie) => {
          return (
            pharmacie.adresse_fournit
              .toLowerCase()
              .includes(adresse_utilisateur.toLowerCase()) ||
            pharmacie.assurances_acceptees
              ?.toLowerCase()
              .includes(nom_assurance.toLowerCase())
          );
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
  //Ajouter une pharmacie
  static async ajouterPharmacie(
    code_gerant,
    nom_pharmacie,
    photo_pharmacie,
    numero_pharmacie,
    latitude_pharmacie,
    longitude_pharmacie,
    adresse_fournit,
    email_pharmacie,
    liste_assurance_accepte,
  ) {
    const connexion = await dataBase.getConnection();

    if (
      !(
        code_gerant &&
        nom_pharmacie &&
        photo_pharmacie &&
        numero_pharmacie &&
        latitude_pharmacie &&
        longitude_pharmacie &&
        email_pharmacie &&
        adresse_fournit &&
        liste_assurance_accepte
      )
    ) {
      return {
        success: false,
        message: "Veuillez vérifier tous les champs",
      };
    }
    await connexion.beginTransaction();
    try {
      //Vérifier l'existance de l'utilisateur gérant
      const requete1 = await connexion.query(
        "SELECT * from utilisateurs WHERE code_utilisateur=?",
        [code_gerant],
      );
      const existe = requete1[0][0];
      if (!existe) {
        return {
          success: false,
          message: "Veuillez d'abord vous inscrir pour ajouter une pharmacie",
        };
      }
      const code_pharma = this.genererCodePharmacie();
      //Enregistrement dans pharmacies
      const requete2 = await connexion.query(
        "INSERT INTO pharmacie(code_pharmacie,nom_pharmacie,photo_pharmacie,numeros_pharmacie,email_pharmacie) VALUES(?,?,?,?,?)",
        [
          code_pharma,
          nom_pharmacie,
          photo_pharmacie,
          numero_pharmacie,
          email_pharmacie,
        ],
      );
      //Insérer dans adresse_pharmacie
      const requete3 = await connexion.query(
        "INSERT INTO adresse_pharmacie (code_pharmacie,latitude,longitude,adresse_fournit) VALUES (?,?,?,?)",
        [code_pharma, latitude_pharmacie, longitude_pharmacie, adresse_fournit],
      );
      //Ajouter les assurances acceptées
      liste_assurance_accepte.forEach(async (assurance) => {
        //Vérifier si l'assurance est déjà dans le système
        const requete4 = await connexion.query(
          "SELECT id_assurance FROM assurances WHERE nom_assurance=?",
          [assurance],
        );
        let id_assurance = requete4[0][0]?.id_assurance;
        if (!id_assurance) {
          const requete5 = await connexion.query(
            "INSERT INTO assurance(nom_assurance) VALUES(?)",
            [assurance],
          );
          id_assurance = requete5.insertId;
        }

        //Enregistrer la liste des assurances acceptées par la pharmacie
        const requete6 = await connexion.query(
          "INSERT INTO pharmacie_assurance(code_pharmacie,id_assurance) VALUES(?,?)",
          [code_pharma, id_assurance],
        );
      });

      //Enregistrer le gérant de la pharmacie
      const requete7 = await connexion.query(
        "INSERT INTO utilisateur_gerant(code_utilisateur,code_pharmacie) VALUES(?,?)",
        [code_gerant, code_pharma],
      );

      //Mettre à jour le type utilisateur
      const requete8 = await connexion.query(
        "UPDATE utilisateurs SET (id_type_utilisateur=?) WHERE code_utilisateur=?",
        [3, code_gerant],
      );

      //Valider toutes les opérations
      connexion.commit();

      return {
        success: true,
        message: "Votre pharmacie a été enregistré avec succès !",
      };
    } catch (error) {
      console.log(error);
      await connexion.rollback();
      return {
        success: false,
        message: "Impossible d'enregistrer cette pharmacie",
      };
    } finally {
      connexion.release();
    }
  }
}

module.exports = Pharmacie;
