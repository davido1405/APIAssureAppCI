const mysql = require("mysql2");

const connexion = mysql.createPool({
  host: process.env.BD_HOST,
  user: process.env.BD_USER,
  password: process.env.BD_PASSWORD,
  database: process.env.BD_NAME,
});

module.exports = connexion.promise();
