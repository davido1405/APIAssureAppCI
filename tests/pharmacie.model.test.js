/* Tests du modèle pharmacie : la photo et l'email sont facultatifs pour
   permettre l'inscription en plusieurs étapes (pharmacie créée plus tard). */

jest.mock("../config/db_config.js", () => ({ getConnection: jest.fn() }));
jest.mock("../logger.js", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../utils/calculdistances.js", () => ({
  degreesToRadians: jest.fn(),
  distance: jest.fn(),
}));
jest.mock("../services/NotificationService.js", () => ({}));

const dataBase = require("../config/db_config.js");
const Pharmacie = require("../models/pharmacie");

function fabriquerConnexion() {
  const appels = [];
  const connexion = {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: jest.fn(async (sql, params) => {
      const texte = String(sql).replace(/\s+/g, " ").trim();
      appels.push({ sql: texte, params });

      if (/^SELECT .* FROM utilisateurs WHERE code_utilisateur/i.test(texte)) return [[{ code_utilisateur: "GER001" }]];
      if (/^SELECT .* FROM utilisateur_gerant/i.test(texte)) return [[]];
      if (/^SELECT .* FROM pharmacie WHERE nom_pharmacie/i.test(texte)) return [[]];
      if (/^SELECT id_ville FROM villes/i.test(texte)) return [[{ id_ville: 1 }]];
      if (/^INSERT INTO pharmacie/i.test(texte)) return [{ insertId: 1 }];
      if (/^INSERT INTO adresse_pharmacie/i.test(texte)) return [{ insertId: 10 }];
      if (/^INSERT INTO villes/i.test(texte)) return [{ insertId: 2 }];
      if (/^INSERT INTO horaires_ouverture/i.test(texte)) return [{ insertId: 3 }];
      if (/^INSERT INTO utilisateur_gerant/i.test(texte)) return [{ insertId: 4 }];
      if (/^UPDATE pharmacie/i.test(texte)) return [{ affectedRows: 1 }];
      if (/^UPDATE utilisateurs/i.test(texte)) return [{ affectedRows: 1 }];
      return [{ affectedRows: 1 }];
    }),
  };
  return { connexion, appels };
}

describe("modèle pharmacie — création multi-étapes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("crée la pharmacie et le lien gérant sans photo ni email", async () => {
    const { connexion, appels } = fabriquerConnexion();
    dataBase.getConnection.mockResolvedValue(connexion);

    const reponse = await Pharmacie.ajouterPharmacie(
      "GER001",
      "Pharmacie Test",
      null,
      "01020304",
      "08:00-18:00",
      "08:00-13:00",
      "Fermée",
      0,
      0,
      "Abidjan",
      "Rue 12",
      null,
      [],
    );

    expect(reponse.success).toBe(true);
    expect(reponse.data.code_pharmacie).toMatch(/^PHARM-/);

    const insertion = appels.find((a) => /^INSERT INTO pharmacie/i.test(a.sql));
    expect(insertion).toBeDefined();
    expect(insertion.params[2]).toBeNull(); // photo
    expect(insertion.params[5]).toBeNull(); // email

    const lienGerant = appels.find((a) => /^INSERT INTO utilisateur_gerant/i.test(a.sql));
    expect(lienGerant).toBeDefined();
    expect(lienGerant.sql).toMatch(/id_statut\) VALUES \(\?, \?, 1\)/);
    expect(lienGerant.params).toEqual(["GER001", reponse.data.code_pharmacie]);

    expect(connexion.commit).toHaveBeenCalled();
    expect(connexion.release).toHaveBeenCalled();
  });

  it("refuse un email fourni mais invalide", async () => {
    const { connexion } = fabriquerConnexion();
    dataBase.getConnection.mockResolvedValue(connexion);

    const reponse = await Pharmacie.ajouterPharmacie(
      "GER001",
      "Pharmacie Test",
      null,
      "01020304",
      "08:00-18:00",
      "08:00-13:00",
      "Fermée",
      0,
      0,
      "Abidjan",
      "Rue 12",
      "pas-un-email",
      [],
    );

    expect(reponse.success).toBe(false);
    expect(reponse.message).toBe("Format d'email invalide");
    expect(connexion.beginTransaction).not.toHaveBeenCalled();
    expect(connexion.release).toHaveBeenCalled();
  });

  it("refuse toujours un nom de pharmacie manquant", async () => {
    const { connexion } = fabriquerConnexion();
    dataBase.getConnection.mockResolvedValue(connexion);

    const reponse = await Pharmacie.ajouterPharmacie(
      "GER001",
      "",
      null,
      "01020304",
      "08:00-18:00",
      "08:00-13:00",
      "Fermée",
      0,
      0,
      "Abidjan",
      "Rue 12",
      null,
      [],
    );

    expect(reponse.success).toBe(false);
    expect(reponse.message).toBe("Veuillez vérifier tous les champs");
    expect(reponse.failed_fields).toContain("nom_pharmacie");
    expect(connexion.beginTransaction).not.toHaveBeenCalled();
  });
});
