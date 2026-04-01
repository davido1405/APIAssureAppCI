const express = require("express");

require("dotenv").config();
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

app.use(bodyParser.json());

app.use("/api", routes);

app.listen(process.env.port || 4000, "0.0.0.0", () => {
  console.log("Server lancé sur: http://localhost:4000");
  console.log("Documentation sur: http://localhost:4000/docs");
  logger.info(`Serveur démaré à ${new Date().toISOString()}`);
});
