const request = require("supertest");
const express = require("express");

// mock model utilisateur to avoid DB if required transitively
jest.mock("../models/utilisateur", () => ({}));
jest.mock("../logger", () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(), warn: jest.fn() }));

const routesUtilisateur = require("../routes/routes.utilisateur");

describe("Utilisateur routes", () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/utilisateur", routesUtilisateur);

  it("POST /recoverPassword -> 501", async () => {
    const res = await request(app).post("/api/utilisateur/recoverPassword");
    expect(res.status).toBe(501);
    expect(res.body).toEqual({
      success: false,
      message: "Récupération du code PIN non disponible pour le moment",
    });
  });
});
