require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const promClient = require("prom-client");

// Collecter CPU, RAM automatiquement
promClient.collectDefaultMetrics();

//initialiser les routes
const routes = require("./routes/api");
const expressJsdocSwagger = require("express-jsdoc-swagger");

const bodyParser = require("body-parser");
const logger = require("./logger");
const { verifierJWT } = require("./middleware/auth");
const { gestionnaireErreurs } = require("./middleware/erreurs");

const app = express();

require("./config/firebase.config");

// Documentation Swagger : exposée UNIQUEMENT hors production.
// En production, /docs et /api-docs ne sont pas enregistrés du tout -> 404.
const exposeSwagger = process.env.NODE_ENV !== "production";

const options = {
  info: {
    title: "Documentation API AssurAppCI",
    description: "Documentation de l'API pour le projet AssurAppCI",
    version: "1.0.0",
  },
  baseDir: __dirname,
  filesPattern: "./routes/*.js",
  swaggerUIPath: "/docs",
  exposeSwaggerUI: exposeSwagger,
  exposeApiDocs: exposeSwagger,
  apiDocsPath: "/api-docs",
};

expressJsdocSwagger(app)(options);

app.use(helmet());

const corsOptions = {
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // Autoriser toutes les origines en développement (front PHP sur 8080, etc.)
  origin: process.env.NODE_ENV !== 'production' ? true : (process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean) : false),
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    /* Exemption IP locale UNIQUEMENT pour les tests de sécurité en local.
       Ne jamais activer cette exemption en production. */
    skip: (req) => {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
    },
  }),
);

app.use((req, res, next) => {
  const debut = Date.now();
  res.on("finish", () => {
    const tempsExecution = Date.now() - debut;
    logger.http(
      `methode: ${req.method} route: ${req.originalUrl} origine: ${req.hostname} statusRequete: ${res.statusCode} tempsExecution: ${tempsExecution}ms`,
    );
  });

  next();
});

// Routes publiques (exemptées de JWT) — l'app Flutter les appelle sans token
const ROUTES_PUBLIQUES = [
  "^/api/utilisateur/inscription$",
  "^/api/utilisateur/connexion$",
  "^/api/utilisateur/refresh$",
  "^/api/utilisateur/recoverPassword$",
  "^/api/pharmacie/rechercher",
  "^/api/pharmacie$",
  "^/api/assurance$",
  "^/api/abonnements/forfaits$",
  "^/api/annonces/toutes$",
];

function estRoutePublique(url) {
  // IMPORTANT : on teste sur le CHEMIN SEUL (sans la chaîne de requête).
  // Sinon les motifs ancrés par « $ » (ex. ^/api/pharmacie$) ne matchent plus
  // dès qu'un ?query est présent, et une route publique devient protégée
  // (ex. GET /api/pharmacie?limits=10 -> 401 au lieu de 200).
  const chemin = String(url).split("?")[0];
  return ROUTES_PUBLIQUES.some((pattern) => new RegExp(pattern).test(chemin));
}

// Middleware d'authentification JWT (mode STRICT par défaut).
// Les routes publiques sont exemptées. Sur toutes les autres routes, un jeton
// valide est exigé. Seule la variable AUTH_STRICT_MODE=false rétablit le mode
// compatibilité (période de transition pour l'app Flutter qui n'envoie pas
// encore le token).
app.use("/api", (req, res, next) => {
  if (estRoutePublique(req.originalUrl)) {
    return next();
  }
  return verifierJWT(req, res, next);
});

// --- Rate-limit DÉDIÉ à l'authentification (anti brute-force) ---
// Limiteur spécifique monté uniquement sur POST /api/utilisateur/connexion.
// Il est distinct du limiteur global (100 req / 15 min / IP) qui, lui, est
// exempté pour les IP locales dans le cadre des tests de sécurité.
// Ici AUCUNE exemption : une IP qui enchaîne les échecs est bloquée.
const limiteurConnexion = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives par IP et par fenêtre (échecs compris)
  standardHeaders: true,
  legacyHeaders: false,
  // ATTENTION : on ne peut PAS utiliser skipSuccessfulRequests, car l'API de
  // connexion répond HTTP 200 même lorsque les identifiants sont invalides
  // (l'échec est signalé dans le corps JSON, pas par le code HTTP). Compter
  // toutes les requêtes est donc nécessaire pour freiner la force brute.
  message: {
    success: false,
    message:
      "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.",
  },
});
app.post("/api/utilisateur/connexion", limiteurConnexion);

// Limiteur dédié au renouvellement de session. Le refresh token n'est pas
// devinable (JWT signé) : ce plafond protège surtout la base de données d'un
// client qui boucle. 120 renouvellements / 15 min / IP laisse largement la
// place à plusieurs postes derrière une même connexion.
const limiteurRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de demandes de renouvellement. Veuillez réessayer dans quelques minutes.",
  },
});
app.post("/api/utilisateur/refresh", limiteurRefresh);

// Route de santé pour le monitor
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    // Indique au harnais si le mock Cloudinary local est actif (jamais en prod).
    cloudinaryMock:
      process.env.MOCK_CLOUDINARY === "true" &&
      process.env.NODE_ENV !== "production",
  });
});

app.use("/api", routes);

// Gestionnaire d'erreurs GLOBAL — TOUJOURS en dernier.
// Garantit qu'aucune pile d'appels ni détail interne ne sort dans la réponse
// HTTP, quel que soit NODE_ENV (voir middleware/erreurs.js).
app.use(gestionnaireErreurs);

app.listen(process.env.PORT || 4000, "0.0.0.0", () => {
  console.log("Server lancé sur: http://localhost:4000");
  console.log("Documentation sur: http://localhost:4000/docs");
  logger.info(`Serveur démaré à ${new Date().toISOString()}`);
});
