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
    // Erreur marquée pour pouvoir être interceptée proprement (400 JSON)
    // par le middleware d'erreurs dédié aux uploads, au lieu de remonter en 500.
    const erreur = new Error(
      "Seulement les images sont autorisées (jpeg, jpg, png, gif, webp)",
    );
    erreur.isUploadError = true;
    erreur.status = 400;
    return cb(erreur);
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

// ============================================================
// VÉRIFICATION DU CONTENU RÉEL (magic bytes)
// ============================================================
// Le fileFilter ne valide que le nom et le type MIME *déclarés* par le client :
// un fichier texte renommé « fake.jpg » (Content-Type: image/jpeg) passait.
// On contrôle donc la signature binaire réelle après réception du buffer.
const SIGNATURES_IMAGE = [
  { nom: "png", octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { nom: "jpeg", octets: [0xff, 0xd8, 0xff] },
  { nom: "gif", octets: [0x47, 0x49, 0x46, 0x38] }, // "GIF8"
  { nom: "bmp", octets: [0x42, 0x4d] }, // "BM"
];

function contenuEstImage(buffer) {
  if (!buffer || buffer.length < 12) return false;
  if (SIGNATURES_IMAGE.some((s) => s.octets.every((b, i) => buffer[i] === b))) {
    return true;
  }
  // WebP : conteneur RIFF avec le type "WEBP" à l'offset 8.
  if (
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

// À monter APRÈS upload.single(...) : rejette en 400 JSON (via gestErrUpload)
// tout fichier dont le contenu n'est pas une image au sens binaire.
function verifierContenuImage(req, res, next) {
  if (!req.file) return next(); // absence de fichier : gérée par le contrôleur
  if (!contenuEstImage(req.file.buffer)) {
    console.log("❌ Contenu non-image (signature invalide)");
    const erreur = new Error(
      "Le fichier envoyé n'est pas une image valide (contenu non reconnu)",
    );
    erreur.isUploadError = true;
    erreur.status = 400;
    return next(erreur);
  }
  return next();
}

upload.verifierContenuImage = verifierContenuImage;

module.exports = upload;
