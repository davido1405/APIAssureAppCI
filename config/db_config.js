const mysql = require("mysql2");

const connexion = mysql.createPool({
  host: process.env.BD_HOST,
  user: process.env.BD_USER,
  password: process.env.BD_PASSWORD,
  database: process.env.BD_NAME,

  dateStrings: true,
  timezone: "+00:00",

  // ✅ CONFIGURATION IMPORTANTE
  connectionLimit: 10, // Nombre max de connexions
  waitForConnections: true, // Attendre si pool plein
  queueLimit: 0, // Pas de limite de queue
  enableKeepAlive: true, // Garder connexions actives
  keepAliveInitialDelay: 0,
});

module.exports = connexion.promise();
