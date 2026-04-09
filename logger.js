const winston = require("winston");
const { combine, timestamp, printf, colorize, align } = winston.format;

// Transports de base (toujours actifs)
const transports = [new winston.transports.Console()];

// Ajouter les fichiers seulement en local
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({
      filename: "./Logs/errors.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "./Logs/debugs.log",
      level: "debug",
    }),
    new winston.transports.File({
      filename: "./Logs/http.log",
      level: "http",
    }),
    new winston.transports.File({
      filename: "./Logs/app-logs.log",
    }),
  );
}

// Ajouter Logtail seulement si le token existe
if (process.env.LOGTAIL_TOKEN) {
  try {
    const { Logtail } = require("@logtail/node");
    const { LogtailTransport } = require("@logtail/winston");
    const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
    transports.push(new LogtailTransport(logtail));
    console.log("✅ Logtail initialisé avec succès");
  } catch (error) {
    console.warn("⚠️ Logtail non disponible :", error.message);
  }
} else {
  console.warn("⚠️ LOGTAIL_TOKEN absent, logs locaux uniquement");
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),
  transports,
});

module.exports = logger;
