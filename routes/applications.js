const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const supabase = require('../config/supabase');

// ---------- Cloudinary config ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ---------- multer (memory storage, 5MB per file) ----------
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, PNG or Word files are allowed'));
    }
    cb(null, true);
  }
});

// ---------- helpers ----------
const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// Accepts true, 'true', 'on', '1', 1, 'yes'
const toBool = (v) =>
  v === true || ['true', 'on', '1', 'yes'].includes(String(v).trim().toLowerCase());

const toInt = (v) => {
  const s = clean(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

const toDate = (v) => {
  const s = clean(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

// ---------- file upload (Cloudinary) ----------
const uploadCertificate = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'naus-certificates', resource_type: 'auto' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(file.buffer);
  });

// ---------- route ----------
router.post(
  '/',
  upload.fields([
    { name: 'mbbsCertificate', maxCount: 1 },
    { name: 'fellowshipCertificate', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const body = req.body;
      const files = req.files;

      if (!files?.mbbsCertificate || !files?.fellowshipCertificate) {
        return res
          .status(400)
          .json({ message: 'Both MBBS and Fellowship certificates are required' });
      }

      const email = clean(body.email)?.toLowerCase();
      if (!email || !clean(body.firstName) || !clean(body.lastName)) {
        return res
          .status(400)
          .json({ message: 'First name, last name and email are required' });
      }

      // Block duplicate pending applications for the same email
      const { data: existing, error: existingError } = await supabase
        .from('applications')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        return res
          .status(409)
          .json({ message: 'An application with this email is already pending' });
      }

      const [mbbsUrl, fellowshipUrl] = await Promise.all([
        uploadCertificate(files.mbbsCertificate[0]),
        uploadCertificate(files.fellowshipCertificate[0])
      ]);

      const record = {
        firstname: clean(body.firstName),
        middlename: clean(body.middleName),
        lastname: clean(body.lastName),
        email,
        phonenumber: clean(body.phoneNumber),
        areaofspecialty: clean(body.areaOfSpecialty),
        streetaddress: clean(body.streetAddress),
        permanentaddress: clean(body.permanentAddress),

        mdcnregistrationnumber: clean(body.mdcnRegistrationNumber),
        yearqualifiedmbbs: toInt(body.yearQualifiedMBBS),
        additionalqualificationmdcn: clean(body.additionalQualificationMDCN),
        yearqualifiedurologist: toInt(body.yearQualifiedUrologist),
        currentpractice: clean(body.currentPractice) || 'Not specified',

        nextofkinname: clean(body.nextOfKinName),
        nextofkinphone: clean(body.nextOfKinPhone),
        nextofkinemail: clean(body.nextOfKinEmail),

        fellowshipcollege: clean(body.fellowshipCollege),
        fwacs: toBool(body.fwacs),
        fmcs: toBool(body.fmcs),
        facs: toBool(body.facs),
        frcs: toBool(body.frcs),
        // if your "others" column is text, change toBool to clean
        others: toBool(body.others),
        qualificationyear: toInt(body.qualificationYear),
        additionalqualification: clean(body.additionalQualification),
        residencytraining: clean(body.residencyTraining),
        foreigninstitution: clean(body.foreignInstitution),
        conferenceattended: clean(body.conferenceAttended),

        declaration: toBool(body.declaration),
        date: toDate(body.date),

        mbbscertificate: mbbsUrl,
        fellowshipcertificate: fellowshipUrl,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([record])
        .select();

      if (error) throw error;

      res.status(201).json({ message: 'Application submitted successfully', data });
    } catch (err) {
      console.error('Application submission error:', err.message, err.details || '');
      res.status(500).json({
        message: 'Failed to submit application.',
        error: err.message
      });
    }
  }
);

// Multer errors (file too large, wrong type) return 400 instead of 500
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('allowed')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;