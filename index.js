require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const promClient = require("prom-client");

// Collecter CPU, RAM automatiquement
promClient.collectDefaultMetrics();

const routes = require("./routes/api");
const expressJsdocSwagger = require("express-jsdoc-swagger");

const bodyParser = require("body-parser");
const logger = require("./logger");

const app = express();

require("./config/firebase.config");

const options = {
  info: {
    title: "Documentation API AssurAppCI",
    description: "Documentation de l'API pour le projet AssurAppCI",
    version: "1.0.0",
  },
  baseDir: __dirname,
  filesPattern: "./routes/*.js",
  swaggerUIPath: "/docs",
  exposeApiDocs: true,
  apiDocsPath: "/api-docs",
};

expressJsdocSwagger(app)(options);

app.use(helmet());

app.use(cors());

app.use(bodyParser.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
// Route de santé pour le monitor
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", routes);

app.listen(process.env.PORT || 4000, "0.0.0.0", () => {
  console.log("Server lancé sur: http://localhost:4000");
  console.log("Documentation sur: http://localhost:4000/docs");
  logger.info(`Serveur démaré à ${new Date().toISOString()}`);
});
