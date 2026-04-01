const winston = require("winston");
const { combine, timestamp, printf, colorize, align } = winston.format;

//Créer le loger de base

const logger = winston.createLogger({
  //Le niveau des log par defaut
  level: process.env.LOG_LEVEL || "debug",

  //Le format de sorti des logs
  format: combine(
    timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),

  //Transports pour ou les log seront redirigés
  transports: [
    new winston.transports.File({
      filename: "./Logs/errors.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "./Logs/http.log", level: "http" }),
    new winston.transports.File({
      filename: "./Logs/debugs.log",
      level: "debug",
    }),
    new winston.transports.File({ filename: "./Logs/app-logs.log" }),
    new winston.transports.Console(),
  ],
});

module.exports = logger;
