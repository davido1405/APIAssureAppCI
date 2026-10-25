const jwt = require("jsonwebtoken");
const logger = require("../logger");
const dataBase = require("../config/db_config.js");

/**
 * Middleware d'authentification JWT (mode strict par défaut).
 *
 * Comportement :
 *  - Si un en-tête Authorization: Bearer <token> est présent : il est vérifié.
 *    En cas d'échec -> 401/403.
 *  - Si aucun token n'est présent :
 *    * MODE STRICT (défaut, ou AUTH_STRICT_MODE=true) : rejet 401.
 *    * MODE COMPATIBILITÉ (uniquement si AUTH_STRICT_MODE=false) : la requête
 *      passe, req.user reste undefined. Les contrôleurs peuvent alors continuer
 *      à lire l'identité depuis le body (période de transition pour l'app
 *      Flutter qui n'envoie pas encore le token).
 *
 * Variables d'environnement :
 *  - AUTH_STRICT_MODE : "false" pour désactiver le contrôle (mode compatibilité).
 *                       Toute autre valeur, ou absence de variable, active le
 *                       mode strict.
 *  - JWT_KEY : secret de signature (déjà utilisé par jwt_manager).
 */

function verifierJWT(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Strict par défaut : seule AUTH_STRICT_MODE=false désactive le contrôle.
  const strictMode = process.env.AUTH_STRICT_MODE !== "false";

  if (!token) {
    if (strictMode) {
      logger.warn(`Accès refusé sans token : ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: "Token d'authentification requis",
      });
    }
    // Mode compatibilité : on passe, req.user reste undefined
    return next();
  }

  jwt.verify(token, process.env.JWT_KEY, { algorithms: ["HS256"] }, (err, decoded) => {
    // Un refresh token ne doit jamais ouvrir une route protégée : il ne sert
    // qu'à obtenir un nouveau jeton d'accès via /api/utilisateur/refresh.
    // (Les deux jetons peuvent partager le même secret si JWT_REFRESH_KEY
    // n'est pas défini, d'où ce contrôle explicite du claim `type`.)
    if (err || (decoded && decoded.type === "refresh")) {
      logger.warn(
        `Token invalide ou expiré : ${req.method} ${req.originalUrl} (${
          err ? err.message : "jeton de rafraîchissement refusé"
        })`,
      );
      return res.status(403).json({
        success: false,
        message: "Token invalide ou expiré",
      });
    }
    // Attacher l'identité décodée à la requête
    req.user = {
      code_utilisateur: decoded.code_utilisateur,
      type_utilisateur: decoded.type_utilisateur,
      mobile: decoded.mobile,
      role: decoded.role || decoded.type_utilisateur,
    };
    next();
  });
}

function estAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentification requise",
    });
  }
  const rolesAdmin = ["admin", "Administrateur"];
  if (!rolesAdmin.includes(req.user.role) && !rolesAdmin.includes(req.user.type_utilisateur)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs",
    });
  }
  next();
}

/**
 * Middleware de comparaison d'identité.
 * Vérifie que l'utilisateur authentifié (req.user) est bien le propriétaire
 * de la ressource visée par le champ d'identité de la requête.
 *
 * @param {string} champBody - Nom du champ dans req.body qui contient le code à comparer
 *                            (ex: 'code_gerant', 'code_utilisateur', 'codePharmacie')
 * @param {string} champParam - Nom du paramètre d'URL (req.params) si applicable
 * @param {string} champQuery - Nom du query param (req.query) si applicable
 */
function verifierIdentite(champBody, champParam, champQuery) {
  return function (req, res, next) {
    // Si pas d'utilisateur authentifié, on laisse passer (mode compatibilité)
    // Les contrôles métier existants dans le contrôleur s'appliqueront encore.
    if (!req.user) {
      return next();
    }

    // Récupérer le code visé par la requête
    let codeVise = null;
    if (champBody && req.body && req.body[champBody] !== undefined) {
      codeVise = req.body[champBody];
    } else if (champParam && req.params && req.params[champParam] !== undefined) {
      codeVise = req.params[champParam];
    } else if (champQuery && req.query && req.query[champQuery] !== undefined) {
      codeVise = req.query[champQuery];
    }

    // Si aucun code visé trouvé, on ne peut pas vérifier : on passe
    if (codeVise === null || codeVise === undefined) {
      return next();
    }

    const codeUtilisateurAuth = req.user.code_utilisateur;

    // Comparaison : le code visé doit correspondre à l'utilisateur authentifié
    if (String(codeVise) !== String(codeUtilisateurAuth)) {
      logger.warn(
        `Tentative d'accès à la ressource d'un autre utilisateur : visé="${codeVise}", authentifié="${codeUtilisateurAuth}" (${req.method} ${req.originalUrl})`,
      );
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette ressource",
      });
    }

    next();
  };
}

/**
 * Vérifie que la pharmacie visée appartient bien à l'utilisateur authentifié.
 *
 * Le code pharmacie (ex. PHARM001) et le code utilisateur (ex. GERANT001) sont
 * deux identifiants distincts : la propriété est portée par la table de liaison
 * utilisateur_gerant. Une simple égalité de chaînes — comme dans
 * verifierIdentite — rejetterait donc le propriétaire légitime.
 *
 * @param {string} champBody  champ du corps contenant le code pharmacie
 * @param {string} champParam champ d'URL contenant le code pharmacie
 * @param {string} champQuery champ de query contenant le code pharmacie
 */
function verifierProprietairePharmacie(champBody, champParam, champQuery) {
  return async function (req, res, next) {
    // Mode compatibilité : pas d'utilisateur authentifié, on laisse passer.
    if (!req.user) {
      return next();
    }

    let codePharmacie = null;
    if (champBody && req.body && req.body[champBody] !== undefined) {
      codePharmacie = req.body[champBody];
    } else if (champParam && req.params && req.params[champParam] !== undefined) {
      codePharmacie = req.params[champParam];
    } else if (champQuery && req.query && req.query[champQuery] !== undefined) {
      codePharmacie = req.query[champQuery];
    }

    // Aucun code visé : le contrôleur appliquera ses propres règles.
    if (codePharmacie === null || codePharmacie === undefined || codePharmacie === "") {
      return next();
    }

    try {
      const [rows] = await dataBase.query(
        "SELECT 1 FROM utilisateur_gerant WHERE code_utilisateur = ? AND code_pharmacie = ? LIMIT 1",
        [req.user.code_utilisateur, String(codePharmacie)],
      );

      if (!rows.length) {
        logger.warn(
          `Tentative d'accès à la pharmacie d'un autre utilisateur : visée="${codePharmacie}", authentifié="${req.user.code_utilisateur}" (${req.method} ${req.originalUrl})`,
        );
        return res.status(403).json({
          success: false,
          message: "Accès non autorisé à cette ressource",
        });
      }

      return next();
    } catch (err) {
      logger.error(
        `Erreur de vérification du propriétaire de la pharmacie : ${err.message}`,
      );
      return res.status(500).json({
        success: false,
        message: "Vérification d'accès impossible pour le moment",
      });
    }
  };
}

module.exports = {
  verifierJWT,
  estAdmin,
  verifierIdentite,
  verifierProprietairePharmacie,
};
