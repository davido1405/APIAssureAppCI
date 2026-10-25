const jwt = require("jsonwebtoken");

/**
 * Gestion des jetons de l'API.
 *
 * Deux jetons distincts sont émis :
 *  - le jeton d'accès (access token) : courte durée (900 s), envoyé dans
 *    l'en-tête Authorization. C'est le format historique, inchangé ;
 *  - le jeton de rafraîchissement (refresh token) : longue durée (30 jours),
 *    porteur du claim `type: "refresh"`. Il ne sert QU'À obtenir un nouveau
 *    jeton d'accès et n'est jamais accepté par les routes protégées.
 *
 * Le refresh token est signé avec JWT_REFRESH_KEY s'il est défini, sinon avec
 * JWT_KEY (repli) pour ne pas bloquer les environnements existants. Comme les
 * deux jetons peuvent alors partager le même secret, verifierJWT refuse
 * explicitement le claim `type: "refresh"`.
 */
class JwtManager {
  static DUREE_ACCESS_SECONDES = 900;
  static DUREE_REFRESH_SECONDES = 30 * 24 * 60 * 60; // 30 jours

  static _cleRefresh() {
    return process.env.JWT_REFRESH_KEY || process.env.JWT_KEY;
  }

  static generateurJWT(code_utilisateur, type_utilisateur, numero_utilisateur) {
    const dateGeneration = Math.floor(new Date() / 1000);
    const dateExpiration = dateGeneration + JwtManager.DUREE_ACCESS_SECONDES;
    const payload = {
      iss: process.env.DOMAIN_NAME,
      iat: dateGeneration,
      exp: dateExpiration,
      type: "access",
      code_utilisateur: code_utilisateur,
      type_utilisateur: type_utilisateur,
      mobile: numero_utilisateur,
    };

    let cleJWT = jwt.sign(payload, process.env.JWT_KEY, { algorithm: "HS256" });

    return cleJWT;
  }

  /**
   * Génère un jeton de rafraîchissement de longue durée.
   * Le claim `type` permet de le distinguer d'un jeton d'accès.
   */
  static generateurRefreshToken(
    code_utilisateur,
    type_utilisateur,
    numero_utilisateur,
  ) {
    const dateGeneration = Math.floor(new Date() / 1000);
    const payload = {
      iss: process.env.DOMAIN_NAME,
      iat: dateGeneration,
      exp: dateGeneration + JwtManager.DUREE_REFRESH_SECONDES,
      type: "refresh",
      code_utilisateur: code_utilisateur,
      type_utilisateur: type_utilisateur,
      mobile: numero_utilisateur,
    };

    return jwt.sign(payload, JwtManager._cleRefresh(), {
      algorithm: "HS256",
    });
  }

  /**
   * Vérifie un jeton de rafraîchissement.
   * Lève une erreur si le jeton est invalide, expiré, ou s'il s'agit d'un
   * jeton d'accès (claim `type` différent de "refresh").
   *
   * @returns {object} le contenu décodé du jeton
   */
  static verificateurRefreshToken(token) {
    const decoded = jwt.verify(token, JwtManager._cleRefresh(), {
      algorithms: ["HS256"],
    });

    if (!decoded || decoded.type !== "refresh" || !decoded.code_utilisateur) {
      const erreur = new Error("Jeton de rafraîchissement invalide");
      erreur.code = "REFRESH_INVALIDE";
      throw erreur;
    }

    return decoded;
  }

  static verificateurJWT(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    jwt.verify(
      token,
      process.env.JWT_KEY,
      { algorithms: ["HS256"] },
      (err, decoded) => {
        if (err || (decoded && decoded.type === "refresh")) {
          return res.status(403).json({ message: "Token invalide ou expiré" });
        }

        req.user = decoded; // contient code_participant + mobile
        next();
      },
    );
  }
}

module.exports = JwtManager;
