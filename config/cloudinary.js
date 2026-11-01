const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use standard local disk storage temporarily, then we can pipe or handle it
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper middlewares matching your existing code structure
const uploadPhoto = upload;
const uploadCertificate = upload;

const getPublicIdFromUrl = (url) => {
  try {
    if (!url) return null;
    const parts = url.split('/');
    const filenameWithExtension = parts[parts.length - 1];
    const publicId = filenameWithExtension.split('.')[0];
    const folder = parts[parts.length - 2];
    return folder && folder !== 'upload' ? `${folder}/${publicId}` : publicId;
  } catch (e) {
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Error deleting from Cloudinary:', err);
  }
};

module.exports = {
  uploadPhoto,
  uploadCertificate,
  deleteFromCloudinary,
  getPublicIdFromUrl,
  cloudinary
};