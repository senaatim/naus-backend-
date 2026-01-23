const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for profile photos
const photoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'naus/photos',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }]
  }
});

// Storage for certificates
const certificateStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'naus/certificates',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
    resource_type: 'auto'
  }
});

// Multer upload instances
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for photos
});

const uploadCertificate = multer({
  storage: certificateStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for certificates
});

// Helper function to delete a file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) return;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log('Cloudinary delete result:', result);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  uploadPhoto,
  uploadCertificate,
  deleteFromCloudinary,
  getPublicIdFromUrl
};
