const mysql = require("mysql2");

const connexion = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT, // ⚠️ Manq

  dateStrings: true,
  timezone: "+00:00",

  // ✅ CONFIGURATION IMPORTANTE
  connectionLimit: 10, // Nombre max de connexions
  waitForConnections: true, // Attendre si pool plein
  queueLimit: 0, // Pas de limite de queue
  enableKeepAlive: true, // Garder connexions actives
  keepAliveInitialDelay: 0,

  // ⚠️ Requis sur Railway
  ssl: {
    rejectUnauthorized: false,
  },

  // ✅ Désactiver only_full_group_by
  multipleStatements: true,
});

// Tester la connexion au démarrage
connexion.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Erreur connexion MySQL :", err.message);
  } else {
    console.log("✅ MySQL connecté avec succès");
    connection.release();
  }
});

module.exports = connexion.promise();
