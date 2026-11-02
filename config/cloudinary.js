const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ---------- multer storage engine that streams straight to Cloudinary ----------
// After upload, req.file.path is the permanent https URL (nothing is written to disk).
class CloudinaryStorage {
  constructor(getParams) {
    this.getParams = getParams;
  }

  _handleFile(req, file, cb) {
    const params = this.getParams(req, file);

    const uploadStream = cloudinary.uploader.upload_stream(params, (err, result) => {
      if (err) return cb(err);
      cb(null, {
        path: result.secure_url,
        filename: result.public_id,
        size: result.bytes
      });
    });

    file.stream.on('error', cb);
    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename, { resource_type: 'image' }, () => cb(null));
  }
}

const makeFilter = (allowed, message) => (req, file, cb) => {
  if (!allowed.includes(file.mimetype)) return cb(new Error(message));
  cb(null, true);
};

// ---------- profile photos ----------
const uploadPhoto = multer({
  storage: new CloudinaryStorage(() => ({
    folder: 'naus-profile-photos',
    resource_type: 'image',
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  })),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: makeFilter(
    ['image/jpeg', 'image/png', 'image/webp'],
    'Only JPG, PNG or WebP images are allowed'
  )
});

// ---------- certificates ----------
const uploadCertificate = multer({
  storage: new CloudinaryStorage(() => ({
    folder: 'naus-certificates',
    resource_type: 'auto'
  })),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: makeFilter(
    ['application/pdf', 'image/jpeg', 'image/png'],
    'Only PDF, JPG or PNG files are allowed'
  )
});

// ---------- helpers ----------
// https://res.cloudinary.com/<cloud>/<type>/upload/v123/folder/name.ext  ->  folder/name
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;

  const match = url.split('?')[0].match(/\/(image|raw|video)\/upload\/(.+)$/);
  if (!match) return null;

  const resourceType = match[1];
  let parts = match[2].split('/');

  const versionIndex = parts.findIndex((p) => /^v\d+$/.test(p));
  if (versionIndex !== -1) parts = parts.slice(versionIndex + 1);

  let publicId = parts.join('/');
  try {
    publicId = decodeURIComponent(publicId);
  } catch (e) {
    // keep as is
  }

  // image public ids have no extension; raw ones keep it
  if (resourceType !== 'raw') publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, '');

  return publicId || null;
};

// Tries the given resource type first, then the others. Never throws.
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;

  const types = [resourceType, ...['image', 'raw', 'video'].filter((t) => t !== resourceType)];

  for (const type of types) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: type });
      if (result && result.result === 'ok') return result;
    } catch (err) {
      console.error(`Cloudinary delete failed (${type}):`, err.message);
    }
  }
  return null;
};

module.exports = {
  cloudinary,
  uploadPhoto,
  uploadCertificate,
  deleteFromCloudinary,
  getPublicIdFromUrl
};