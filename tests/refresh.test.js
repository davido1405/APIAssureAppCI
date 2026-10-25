const request = require("supertest");
const express = require("express");

process.env.JWT_KEY = "cle-de-test-refresh";

jest.mock("../models/utilisateur", () => ({
  rafraichirSession: jest.fn(),
}));

jest.mock("../config/db_config.js", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

jest.mock("../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  warn: jest.fn(),
}));

const controllerUtilisateur = require("../controllers/controller.utilisateurs");
const modelUtilisateur = require("../models/utilisateur");
const jwtManager = require("../config/jwt_manager");
const { verifierJWT } = require("../middleware/auth");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post("/api/utilisateur/refresh", controllerUtilisateur.refresh);
  app.get("/api/protege", verifierJWT, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  });
  return app;
}

describe("Refresh token — jetons", () => {
  const access = jwtManager.generateurJWT("GERANT001", "Gestionnaire de pharmacie", "+2250701010101");
  const refresh = jwtManager.generateurRefreshToken("GERANT001", "Gestionnaire de pharmacie", "+2250701010101");

  it("le jeton d'accès est de type access et dure 900 s", () => {
    const decoded = require("jsonwebtoken").decode(access);
    expect(decoded.type).toBe("access");
    expect(decoded.exp - decoded.iat).toBe(900);
  });

  it("le refresh token est de type refresh et dure 30 jours", () => {
    const decoded = require("jsonwebtoken").decode(refresh);
    expect(decoded.type).toBe("refresh");
    expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60);
  });

  it("verificateurRefreshToken accepte un refresh token", () => {
    const decoded = jwtManager.verificateurRefreshToken(refresh);
    expect(decoded.code_utilisateur).toBe("GERANT001");
  });

  it("verificateurRefreshToken refuse un jeton d'accès", () => {
    expect(() => jwtManager.verificateurRefreshToken(access)).toThrow();
  });

  it("verifierJWT refuse un refresh token sur une route protégée", async () => {
    const res = await request(makeApp())
      .get("/api/protege")
      .set("Authorization", `Bearer ${refresh}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Token invalide ou expiré");
  });

  it("verifierJWT accepte un jeton d'accès", async () => {
    const res = await request(makeApp())
      .get("/api/protege")
      .set("Authorization", `Bearer ${access}`);
    expect(res.status).toBe(200);
    expect(res.body.user.code_utilisateur).toBe("GERANT001");
  });
});

describe("POST /api/utilisateur/refresh", () => {
  const app = makeApp();

  beforeEach(() => {
    modelUtilisateur.rafraichirSession.mockReset();
  });

  it("sans jeton -> 400", async () => {
    const res = await request(app).post("/api/utilisateur/refresh").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(modelUtilisateur.rafraichirSession).not.toHaveBeenCalled();
  });

  it("jeton valide -> 200 avec nouveaux jetons", async () => {
    modelUtilisateur.rafraichirSession.mockResolvedValue({
      success: true,
      message: "Session renouvelée avec succès !",
      data: {
        code_utilisateur: "GERANT001",
        jwt_tokens: "nouveau-access",
        refresh_token: "nouveau-refresh",
        expires_in: 900,
      },
    });

    const res = await request(app)
      .post("/api/utilisateur/refresh")
      .send({ refresh_token: "refresh-valide" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jwt_tokens).toBe("nouveau-access");
    expect(res.body.data.refresh_token).toBe("nouveau-refresh");
    expect(modelUtilisateur.rafraichirSession).toHaveBeenCalledWith("refresh-valide");
  });

  it("jeton invalide -> 401", async () => {
    modelUtilisateur.rafraichirSession.mockResolvedValue({
      success: false,
      http_status: 401,
      message: "Session expirée. Veuillez vous reconnecter.",
    });

    const res = await request(app)
      .post("/api/utilisateur/refresh")
      .send({ refresh_token: "mort" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("incident serveur -> 503", async () => {
    modelUtilisateur.rafraichirSession.mockResolvedValue({
      success: false,
      http_status: 503,
      message: "Renouvellement impossible pour le moment. Veuillez réessayer.",
    });

    const res = await request(app)
      .post("/api/utilisateur/refresh")
      .send({ refresh_token: "refresh" });

    expect(res.status).toBe(503);
  });

  it("accepte le jeton dans l'en-tête Authorization", async () => {
    modelUtilisateur.rafraichirSession.mockResolvedValue({
      success: true,
      message: "Session renouvelée avec succès !",
      data: { jwt_tokens: "a", refresh_token: "b", expires_in: 900 },
    });

    const res = await request(app)
      .post("/api/utilisateur/refresh")
      .set("Authorization", "Bearer refresh-entete")
      .send({});

    expect(res.status).toBe(200);
    expect(modelUtilisateur.rafraichirSession).toHaveBeenCalledWith("refresh-entete");
  });
});
