// config/firebase.config.js

const admin = require("firebase-admin");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Sur Railway : parser directement le JSON
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log(
      "✅ Service Account chargé depuis les variables d'environnement",
    );
  } else {
    // En local : charger depuis le fichier
    serviceAccount = require("../serviceAccountKey.json");
    console.log("✅ Service Account chargé depuis le fichier local");
  }
} catch (error) {
  console.error("❌ Erreur chargement Service Account:", error.message);
  process.exit(1);
}

// Vérifier que la clé n'est pas vide
if (!serviceAccount || !serviceAccount.project_id) {
  console.error("❌ Service Account invalide ou vide");
  process.exit(1);
}

// Initialiser Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialisé avec succès");
  console.log(`📱 Project ID: ${serviceAccount.project_id}`);
} catch (error) {
  console.error("❌ Erreur initialisation Firebase:", error.message);
  process.exit(1);
}

const messaging = admin.messaging();

module.exports = {
  admin,
  messaging,
};
