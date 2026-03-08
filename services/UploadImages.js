// services/UploadImages.js
const cloudinary = require("../config/cloudinary.config");
const streamifier = require("streamifier");

class ImageManagement {
  // ✅ Upload depuis un buffer (Multer memory)
  static async uploadFromBuffer(fileBuffer, fileName) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "pharmacies",
          public_id: fileName,
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("❌ Erreur upload Cloudinary:", error);
            reject(error);
          } else {
            console.log("✅ Upload réussi:", result.secure_url);
            resolve(result);
          }
        },
      );

      // ✅ Convertir buffer en stream
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  // Supprimer une image
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log("Image supprimée:", result);
      return result;
    } catch (error) {
      console.error("Erreur suppression:", error);
      throw error;
    }
  }

  // Extraire public_id d'une URL
  static extractPublicId(url) {
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
  }
}

module.exports = ImageManagement;
