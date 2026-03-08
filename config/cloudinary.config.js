// config/cloudinary.config.js
const cloudinaryn = require("cloudinary").v2;
require("dotenv").config();

// Configuration Cloudinary
cloudinaryn.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "djy78ind6",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinaryn;
