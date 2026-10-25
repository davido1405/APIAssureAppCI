const request = require("supertest");
const express = require("express");
const multer = require("multer");

jest.mock("../models/pharmacie", () => ({
  ajouterPharmacie: jest.fn(),
  modifierPharmacie: jest.fn(),
  mettreAJourStatutGarde: jest.fn(),
  profilPharmacie: jest.fn(),
  ajouterAssurance: jest.fn(),
  rechercherPharmacie: jest.fn(),
  toutePharmacies: jest.fn(),
}));

jest.mock("../services/UploadImages", () => ({
  uploadFromBuffer: jest.fn(),
}));

jest.mock("../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  warn: jest.fn(),
}));

const controllerPharmacie = require("../controllers/controller.pharmacie");
const ModelPharmacie = require("../models/pharmacie");
const ImageManagement = require("../services/UploadImages");
const upload = require("../middleware/upload");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.post("/api/pharmacie/ajouterPharmacie", upload.single("photo"), controllerPharmacie.ajouterPharmacie);
  app.put("/api/pharmacie/modifierpharmacie", upload.single("photo"), controllerPharmacie.modifierPharmacie);
  app.put("/api/pharmacie/modifierstatutgarde", controllerPharmacie.mettreAJourStatutGarde);
  app.post("/api/pharmacie/profilpharmacie", controllerPharmacie.profilPharmacie);
  app.post("/api/pharmacie/ajouterassurance", controllerPharmacie.ajouterAssurance);
  app.get("/api/pharmacie/rechercher", controllerPharmacie.rechercherPharmacie);
  app.get("/api/pharmacie", controllerPharmacie.toutePharmacies);
  return app;
}

describe("Pharmacie controller", () => {
  let app;
  beforeEach(() => {
    app = makeApp();
    jest.clearAllMocks();
  });

  const validBody = {
    code_gerant: "GER001",
    nom_pharmacie: "Pharmacie Test",
    numero_pharmacie: "01020304",
    email_pharmacie: "test@test.ci",
    ville_pharmacie: "Abidjan",
    adresse_fournit: "Rue 12",
    horaires_en_semaine: "08:00-18:00",
    horaires_samedi: "08:00-13:00",
    horaires_dimanche: "Fermé",
    latitudePharmacie: "5.3",
    longitudePharmacie: "-4.0",
    liste_assurance_accepte: JSON.stringify(["NSIA"]),
  };

  it("ajouterPharmacie: body valide + fichier -> 201", async () => {
    ImageManagement.uploadFromBuffer.mockResolvedValue({ secure_url: "http://photo.url" });
    ModelPharmacie.ajouterPharmacie.mockResolvedValue({ success: true, message: "ok" });

    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(validBody)
      .attach("photo", Buffer.from("fakeimage"), { filename: "photo.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(ModelPharmacie.ajouterPharmacie).toHaveBeenCalled();
  });

  it("ajouterPharmacie: champ manquant -> 400", async () => {
    const body = { ...validBody };
    delete body.nom_pharmacie;
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(body)
      .attach("photo", Buffer.from("fakeimage"), { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("ajouterPharmacie: JSON d'assurances invalide -> 400", async () => {
    const body = { ...validBody, liste_assurance_accepte: "{invalid" };
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(body)
      .attach("photo", Buffer.from("fakeimage"), { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("ajouterPharmacie: sans photo -> 201 (photo facultative)", async () => {
    ModelPharmacie.ajouterPharmacie.mockResolvedValue({ success: true, message: "ok" });
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(validBody);
    expect(res.status).toBe(201);
    expect(ModelPharmacie.ajouterPharmacie).toHaveBeenCalledWith(
      "GER001", "Pharmacie Test", null, "01020304",
      "08:00-18:00", "08:00-13:00", "Fermé", 5.3, -4, "Abidjan", "Rue 12",
      "test@test.ci", ["NSIA"],
    );
  });

  it("ajouterPharmacie: sans email ni coordonnées GPS -> 201", async () => {
    ModelPharmacie.ajouterPharmacie.mockResolvedValue({ success: true, message: "ok" });
    const body = { ...validBody };
    delete body.email_pharmacie;
    delete body.latitudePharmacie;
    delete body.longitudePharmacie;
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(body);
    expect(res.status).toBe(201);
    expect(ModelPharmacie.ajouterPharmacie).toHaveBeenCalledWith(
      "GER001", "Pharmacie Test", null, "01020304",
      "08:00-18:00", "08:00-13:00", "Fermé", 0, 0, "Abidjan", "Rue 12",
      null, ["NSIA"],
    );
  });

  it("ajouterPharmacie: email facultatif mais validé s'il est fourni -> 400", async () => {
    const body = { ...validBody, email_pharmacie: "pas-un-email" };
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(body);
    expect(res.status).toBe(400);
    expect(ModelPharmacie.ajouterPharmacie).not.toHaveBeenCalled();
  });

  it("ajouterPharmacie: coordonnées invalides -> 400", async () => {
    ImageManagement.uploadFromBuffer.mockResolvedValue({ secure_url: "http://photo.url" });
    const body = { ...validBody, latitudePharmacie: "abc" };
    const res = await request(app)
      .post("/api/pharmacie/ajouterPharmacie")
      .field(body)
      .attach("photo", Buffer.from("fakeimage"), { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("ajouterPharmacie: aucune ReferenceError", async () => {
    ImageManagement.uploadFromBuffer.mockResolvedValue({ secure_url: "http://photo.url" });
    ModelPharmacie.ajouterPharmacie.mockResolvedValue({ success: true });
    let thrown = null;
    try {
      await request(app).post("/api/pharmacie/ajouterPharmacie").field(validBody).attach("photo", Buffer.from("fakeimage"), { filename: "photo.png", contentType: "image/png" });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeNull();
  });

  it("modifierPharmacie: succès -> 200", async () => {
    ModelPharmacie.modifierPharmacie.mockResolvedValue({ success: true, message: "ok" });
    const res = await request(app)
      .put("/api/pharmacie/modifierpharmacie")
      .field({ code_pharmacie: "PH001", nom_pharmacie: "X" });
    expect(res.status).toBe(200);
  });

  it("modifierPharmacie: code_pharmacie manquant -> 400", async () => {
    const res = await request(app)
      .put("/api/pharmacie/modifierpharmacie")
      .field({ nom_pharmacie: "X" });
    expect(res.status).toBe(400);
  });

  it("modifierPharmacie: échec du modèle -> 400", async () => {
    ModelPharmacie.modifierPharmacie.mockResolvedValue({ success: false, message: "fail" });
    const res = await request(app)
      .put("/api/pharmacie/modifierpharmacie")
      .field({ code_pharmacie: "PH001" });
    expect(res.status).toBe(400);
  });

  it("mettreAJourStatutGarde: est_de_garde chaîne -> 400", async () => {
    const res = await request(app)
      .put("/api/pharmacie/modifierstatutgarde")
      .send({ code_pharmacie: "PH001", est_de_garde: "true" });
    expect(res.status).toBe(400);
  });

  it("mettreAJourStatutGarde: booléen -> 200", async () => {
    ModelPharmacie.mettreAJourStatutGarde.mockResolvedValue({ success: true });
    const res = await request(app)
      .put("/api/pharmacie/modifierstatutgarde")
      .send({ code_pharmacie: "PH001", est_de_garde: true });
    expect(res.status).toBe(200);
  });

  // 4. modèle lève erreur -> 500
  it.each([
    ["profilPharmacie", "/api/pharmacie/profilpharmacie", "post", { code_gerant: "G1" }],
    ["ajouterAssurance", "/api/pharmacie/ajouterassurance", "post", { codePharmacie: "P1", liste_assurance: [] }],
    ["rechercherPharmacie", "/api/pharmacie/rechercher", "get", null],
    ["toutePharmacies", "/api/pharmacie", "get", null],
  ])("%s -> 500 JSON", async (name, path, method, body) => {
    if (name === "profilPharmacie") ModelPharmacie.profilPharmacie.mockRejectedValue(new Error("boom"));
    if (name === "ajouterAssurance") ModelPharmacie.ajouterAssurance.mockRejectedValue(new Error("boom"));
    if (name === "rechercherPharmacie") ModelPharmacie.rechercherPharmacie.mockRejectedValue(new Error("boom"));
    if (name === "toutePharmacies") ModelPharmacie.toutePharmacies.mockRejectedValue(new Error("boom"));

    let req = request(app)[method](path);
    if (body) req = req.send(body);
    const res = await req;
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: "Erreur serveur" });
  });

  // 5. limits
  it("toutePharmacies: ?limits=20 transmis comme 20", async () => {
    ModelPharmacie.toutePharmacies.mockResolvedValue({ success: true, data: [] });
    await request(app).get("/api/pharmacie?limits=20");
    expect(ModelPharmacie.toutePharmacies).toHaveBeenCalledWith(20);
  });

  it("toutePharmacies: absent -> undefined", async () => {
    ModelPharmacie.toutePharmacies.mockResolvedValue({ success: true, data: [] });
    await request(app).get("/api/pharmacie");
    expect(ModelPharmacie.toutePharmacies).toHaveBeenCalledWith(undefined);
  });

  it("toutePharmacies: valeur invalide ignorée", async () => {
    ModelPharmacie.toutePharmacies.mockResolvedValue({ success: true, data: [] });
    await request(app).get("/api/pharmacie?limits=abc");
    expect(ModelPharmacie.toutePharmacies).toHaveBeenCalledWith(undefined);
  });
});
