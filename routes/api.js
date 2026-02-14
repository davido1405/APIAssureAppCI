const express = require("express");

const router = express.Router();

router.use("/pharmacie", require("./routes.pharmacie"));

router.use("/assurance", require("./routes.assurances"));

router.use("/utilisateur", require("./routes.utilisateur"));

router.use("/annonces", require("./routes.annonces"));

router.use("/abonnementPharmacie", require("./routes.abonnementPharmacie"));

router.use("/newsLetters", require("./routes.newsLetters"));
module.exports = router;
