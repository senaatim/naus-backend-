const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Import the database pool
const { pool } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (_req, file, cb) => {
    // Generate unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + '-' + file.fieldname + extension);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDF, JPG, PNG files
    if (file.mimetype === 'application/pdf' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'application/msword' || // .doc
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // .docx
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

// Helper function to convert checkbox values to booleans
const convertCheckboxValue = (value) => {
  if (value === 'true' || value === true || value === 1 || value === '1') {
    return 1; // MySQL BOOLEAN uses 1/0
  }
  return 0;
};

// Handle application submission with documents
router.post('/', upload.fields([
  { name: 'mbbsCertificate', maxCount: 1 },
  { name: 'fellowshipCertificate', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const {
      firstName, middleName, lastName, email, phoneNumber,
      streetAddress, permanentAddress, mdcnRegistrationNumber,
      yearQualifiedMBBS, additionalQualificationMDCN, yearQualifiedUrologist,
      currentPractice, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
      fellowshipCollege, fwacs, fmcs, facs, frcs, others,
      qualificationYear, additionalQualification, residencyTraining,
      foreignInstitution, conferenceAttended, declaration,
      date, areaOfSpecialty
    } = req.body;

    // Get uploaded file names
    const mbbsCertFile = req.files?.['mbbsCertificate']?.[0]?.filename || null;
    const fellowshipCertFile = req.files?.['fellowshipCertificate']?.[0]?.filename || null;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !mdcnRegistrationNumber || 
        !yearQualifiedMBBS || !additionalQualificationMDCN || !yearQualifiedUrologist || 
        !currentPractice || !nextOfKinName || !nextOfKinPhone || !nextOfKinEmail ||
        !fellowshipCollege || !qualificationYear || !additionalQualification || 
        !residencyTraining || !declaration) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: {
          firstName: !firstName,
          lastName: !lastName,
          email: !email,
          phoneNumber: !phoneNumber,
          mdcnRegistrationNumber: !mdcnRegistrationNumber,
          yearQualifiedMBBS: !yearQualifiedMBBS,
          additionalQualificationMDCN: !additionalQualificationMDCN,
          yearQualifiedUrologist: !yearQualifiedUrologist,
          currentPractice: !currentPractice,
          nextOfKinName: !nextOfKinName,
          nextOfKinPhone: !nextOfKinPhone,
          nextOfKinEmail: !nextOfKinEmail,
          fellowshipCollege: !fellowshipCollege,
          qualificationYear: !qualificationYear,
          additionalQualification: !additionalQualification,
          residencyTraining: !residencyTraining,
          declaration: !declaration
        }
      });
    }

    if (!mbbsCertFile || !fellowshipCertFile) {
      return res.status(400).json({ 
        error: 'Both MBBS and Fellowship certificates are required',
        files: {
          mbbsCertificate: !!mbbsCertFile,
          fellowshipCertificate: !!fellowshipCertFile
        }
      });
    }

    // Convert boolean values properly
    const fwacsBool = convertCheckboxValue(fwacs);
    const fmcsBool = convertCheckboxValue(fmcs);
    const facsBool = convertCheckboxValue(facs);
    const frcsBool = convertCheckboxValue(frcs);
    const othersBool = convertCheckboxValue(others);

    // Count: 32 columns, 32 values
    const [result] = await pool.execute(
      `INSERT INTO applications
       (firstName, middleName, lastName, email, phoneNumber,
        streetAddress, permanentAddress, mdcnRegistrationNumber,
        yearQualifiedMBBS, additionalQualificationMDCN, yearQualifiedUrologist,
        currentPractice, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
        fellowshipCollege, fwacs, fmcs, facs, frcs, others,
        qualificationYear, additionalQualification, residencyTraining,
        foreignInstitution, conferenceAttended, declaration,
        areaOfSpecialty, status, date,
        mbbsCertificate, fellowshipCertificate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName, 
        middleName, 
        lastName, 
        email, 
        phoneNumber,
        streetAddress, 
        permanentAddress, 
        mdcnRegistrationNumber,
        yearQualifiedMBBS, 
        additionalQualificationMDCN, 
        yearQualifiedUrologist,
        currentPractice, 
        nextOfKinName, 
        nextOfKinPhone, 
        nextOfKinEmail,
        fellowshipCollege, 
        fwacsBool, 
        fmcsBool, 
        facsBool, 
        frcsBool, 
        othersBool,
        qualificationYear, 
        additionalQualification, 
        residencyTraining,
        foreignInstitution, 
        conferenceAttended, 
        declaration,
        areaOfSpecialty || 'General Surgery', 
        'pending', 
        date,
        mbbsCertFile, 
        fellowshipCertFile
      ]
    );

    console.log('Application inserted successfully with ID:', result.insertId);

    res.status(201).json({ 
      message: 'Application submitted successfully',
      id: result.insertId 
    });
  } catch (err) {
    console.error('Application submission error:', err);
    console.error('Error details:', err.message);
    console.error('Error code:', err.code);
    console.error('Error sqlState:', err.sqlState);

    // Handle duplicate email error
    if (err.code === 'ER_DUP_ENTRY' && err.message.includes('email')) {
      return res.status(400).json({
        message: 'An application with this email address already exists. Please use a different email or contact us if you need to update your existing application.'
      });
    }

    res.status(500).json({
      message: 'Failed to submit application. Please try again later.',
      error: err.message
    });
  }
});

module.exports = router;