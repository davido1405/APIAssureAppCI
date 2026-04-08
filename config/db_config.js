const mysql = require("mysql2");

const connexion = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,

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
