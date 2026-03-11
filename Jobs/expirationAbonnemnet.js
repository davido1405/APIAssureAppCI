// jobs/expirerAbonnements.js
const cron = require("node-cron");
const dataBase = require("../config/db_config");

// Exécuter tous les jours à minuit
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Vérification des abonnements expirés...");

  const connexion = await dataBase.getConnection();

  try {
    // Marquer les abonnements expirés
    const [result] = await connexion.query(`
      UPDATE abonnements 
      SET id_statut = 2 
      WHERE date_fin < NOW() 
        AND id_statut = 1
    `);

    console.log(`✅ ${result.affectedRows} abonnements expirés`);

    // TODO: Envoyer des notifications aux pharmacies concernées
  } catch (error) {
    console.error("❌ Erreur expiration abonnements:", error);
  } finally {
    connexion.release();
  }
});
