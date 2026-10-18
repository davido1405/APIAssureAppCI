// middleware/erreurs.js
//
// Gestion centralisée des erreurs.
//   - gestErrUpload      : handler dédié aux erreurs d'upload (Multer + fileFilter)
//                          -> toujours 400 + JSON propre.
//   - gestionnaireErreurs: handler GLOBAL monté en dernier dans Express.
//                          -> ne renvoie JAMAIS de pile d'appels dans la réponse,
//                             quel que soit NODE_ENV. La pile part uniquement
//                             dans les logs serveur (logger.error).

const multer = require("multer");
const logger = require("../logger");

// Détecte aussi bien une MulterError (ex. LIMIT_FILE_SIZE) qu'une erreur
// remontée par le fileFilter (marquée isUploadError dans middleware/upload.js).
function estErreurUpload(err) {
  if (!err) return false;
  return (
    err instanceof multer.MulterError ||
    err.name === "MulterError" ||
    err.isUploadError === true ||
    (typeof err.code === "string" && err.code.startsWith("LIMIT_"))
  );
}

// Traduit une erreur d'upload en message clair, sans exposer d'information interne.
function messageUpload(err) {
  if (err instanceof multer.MulterError || err.name === "MulterError") {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return "Fichier trop volumineux (10 Mo maximum).";
      case "LIMIT_FILE_COUNT":
        return "Trop de fichiers envoyés.";
      case "LIMIT_UNEXPECTED_FILE":
        return "Champ de fichier inattendu.";
      case "LIMIT_PART_COUNT":
        return "Requête multipart invalide (trop de parties).";
      default:
        return "Fichier invalide.";
    }
  }
  // Erreur issue du fileFilter : son message est déjà destiné à l'utilisateur.
  return (
    err.message ||
    "Fichier non autorisé : seules les images sont acceptées (jpeg, jpg, png, gif, webp)."
  );
}

// Handler d'erreur DÉDIÉ aux routes d'upload.
// À monter dans le routeur concerné, APRÈS les routes (voir routes.pharmacie.js).
function gestErrUpload(err, req, res, next) {
  if (!estErreurUpload(err)) {
    return next(err); // laisse passer vers le handler global
  }
  logger.error(
    `Erreur upload (${req.method} ${req.originalUrl}) : ${err.message}`,
  );
  // 400 : requête invalide. Aucune pile, aucun détail interne.
  return res.status(400).json({
    success: false,
    message: messageUpload(err),
  });
}

// Handler d'erreur GLOBAL (toujours monté en dernier).
// eslint-disable-next-line no-unused-vars
function gestionnaireErreurs(err, req, res, next) {
  let status = Number.isInteger(err && err.status) ? err.status : 500;
  if (status < 400 || status > 599) status = 500;

  // Journalisation : la pile reste CÔTÉ SERVEUR, jamais dans la réponse.
  logger.error(
    `Erreur non gérée (${req.method} ${req.originalUrl}) status=${status} : ${
      err && err.message ? err.message : err
    }`,
  );
  if (err && err.stack) {
    logger.error(err.stack);
  }

  if (res.headersSent) {
    return next(err);
  }

  // En 5xx : message générique. En 4xx : message utilisateur de l'erreur.
  const message =
    status >= 500
      ? "Erreur serveur"
      : (err && err.message) || "Requête invalide";

  // Le corps ne contient JAMAIS de pile d'appels, quel que soit NODE_ENV.
  return res.status(status).json({ success: false, message });
}

module.exports = { gestErrUpload, gestionnaireErreurs };
