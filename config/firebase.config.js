// config/firebase.config.js

const admin = require("firebase-admin");

// Chemin vers votre clé privée
const serviceAccountPath = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
  console.log("✅ Service Account chargé avec succès");
} catch (error) {
  console.error("❌ Erreur chargement Service Account:", error);
  console.error(
    "⚠️ Assurez-vous que serviceAccountKey.json existe à la racine du projet",
  );
  process.exit(1);
}

// Vérifier que la clé n'est pas vide
if (!serviceAccount.project_id) {
  console.error("❌ Service Account invalide ou vide");
  process.exit(1);
}

// Initialiser Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Optionnel : Database URL si vous utilisez Realtime Database
    // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  console.log("✅ Firebase Admin initialisé avec succès");
  console.log(`📱 Project ID: ${serviceAccount.project_id}`);
} catch (error) {
  console.error("❌ Erreur initialisation Firebase:", error);
  process.exit(1);
}

// Exporter le service messaging
const messaging = admin.messaging();

module.exports = {
  admin,
  messaging,
};
