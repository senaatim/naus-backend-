const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const photoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'naus-photos', allowed_formats: ['jpg', 'png', 'jpeg'] }
});

const certificateStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'naus-certificates', allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'], resource_type: 'auto' }
});

const uploadPhoto = multer({ storage: photoStorage });
const uploadCertificate = multer({ storage: certificateStorage });

const getPublicIdFromUrl = (url) => {
  try {
    const parts = url.split('/');
    const filenameWithExtension = parts[parts.length - 1];
    const publicId = filenameWithExtension.split('.')[0];
    const folder = parts[parts.length - 2];
    return folder ? `${folder}/${publicId}` : publicId;
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
  getPublicIdFromUrl
};