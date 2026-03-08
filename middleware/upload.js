// middleware/upload.js
const multer = require("multer");
const path = require("path");

// ✅ Stockage en mémoire
const storage = multer.memoryStorage();

// ✅ FileFilter corrigé pour accepter les images même avec mimetype générique
const fileFilter = (req, file, cb) => {
  console.log("=== FileFilter ===");
  console.log("Filename:", file.originalname);
  console.log("Mimetype:", file.mimetype);

  // ✅ Vérifier l'extension du fichier
  const allowedExtensions = /jpeg|jpg|png|gif|webp|bmp/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase(),
  );

  // ✅ Vérifier le mimetype (accepter aussi octet-stream)
  const allowedMimetypes =
    /image\/(jpeg|jpg|png|gif|webp|bmp)|application\/octet-stream/;
  const mimetype = allowedMimetypes.test(file.mimetype);

  // ✅ Accepter si l'extension est valide OU si c'est une image
  if (extname || mimetype) {
    console.log("✅ Fichier accepté");
    return cb(null, true);
  } else {
    console.log("❌ Fichier rejeté");
    cb(
      new Error(
        "Seulement les images sont autorisées (jpeg, jpg, png, gif, webp)",
      ),
    );
  }
};

// ✅ Configuration de Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB (augmenté pour être sûr)
  },
  fileFilter: fileFilter,
});

module.exports = upload;
