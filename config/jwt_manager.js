const jwt = require("jsonwebtoken");

class JwtManager {
  static generateurJWT(code_utilisateur, type_utilisateur, numero_utilisateur) {
    const dateGeneration = Math.floor(new Date() / 1000);
    const dateExpiration = dateGeneration + 900;
    const payload = {
      iss: process.env.DOMAIN_NAME,
      iat: dateGeneration,
      exp: dateExpiration,
      code_utilisateur: code_utilisateur,
      type_utilisateur: type_utilisateur,
      mobile: numero_utilisateur,
    };

    let cleJWT = jwt.sign(payload, process.env.JWT_KEY, { algorithm: "HS256" });

    return cleJWT;
  }

  static verificateurJWT(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Token invalide ou expiré" });
      }

      req.user = decoded; // contient code_participant + mobile
      next();
    });
  }
}

module.exports = JwtManager;
