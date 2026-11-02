const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const {
  uploadPhoto,
  uploadCertificate,
  deleteFromCloudinary,
  getPublicIdFromUrl
} = require('../config/cloudinary');

// Supabase Token Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// =====================================================
// SPECIFIC PROFILE SUB-ROUTES
// =====================================================

// POST upload profile photo (Cloudinary)
router.post('/profile/photo', authenticateToken, uploadPhoto.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const userEmail = req.user.email ? req.user.email.trim() : '';
    const photoUrl = req.file.path;

    // Get current photo to delete old one from Cloudinary
    const { data: member } = await supabase
      .from('members')
      .select('profilephoto')
      .ilike('email', userEmail)
      .maybeSingle();

    if (member && member.profilephoto) {
      const oldPublicId = getPublicIdFromUrl(member.profilephoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Update profile photo in Supabase
    const { error } = await supabase
      .from('members')
      .update({ profilephoto: photoUrl })
      .ilike('email', userEmail);

    if (error) throw error;

    res.json({
      message: 'Profile photo uploaded successfully',
      photoUrl: photoUrl
    });

  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ message: 'Error uploading profile photo', error: error.message });
  }
});

// PUT update privacy settings (directory visibility)
router.put('/profile/privacy', authenticateToken, async (req, res) => {
  try {
    const { showInDirectory } = req.body;
    const userEmail = req.user.email ? req.user.email.trim() : '';

    if (typeof showInDirectory !== 'boolean') {
      return res.status(400).json({ message: 'showInDirectory must be a boolean' });
    }

    const { error } = await supabase
      .from('members')
      .update({ showindirectory: showInDirectory })
      .ilike('email', userEmail);

    if (error) throw error;

    res.json({
      message: 'Privacy settings updated successfully',
      showInDirectory: showInDirectory
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ message: 'Error updating privacy settings', error: error.message });
  }
});

// =====================================================
// GENERAL PROFILE ROUTES
// =====================================================

// GET member profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email ? req.user.email.trim() : '';
    console.log('🔍 Fetching profile for email:', userEmail);

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .ilike('email', userEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (!member) {
      console.warn(`⚠️ Member profile not found for email: ${userEmail}`);
      return res.status(404).json({ message: 'Member profile not found' });
    }

    res.json({
      id: member.id || req.user.id,
      membershipNumber: member.membershipnumber,
      email: member.email,
      firstName: member.firstname,
      middleName: member.middlename,
      lastName: member.lastname,
      phoneNumber: member.phonenumber,
      areaOfSpecialty: member.areaofspecialty,
      streetAddress: member.streetaddress,
      permanentAddress: member.permanentaddress,
      mdcnRegistrationNumber: member.mdcnregistrationnumber,
      yearQualifiedMBBS: member.yearqualifiedmbbs,
      additionalQualificationMDCN: member.additionalqualificationmdcn,
      yearQualifiedUrologist: member.yearqualifiedurologist,
      currentPractice: member.currentpractice,
      nextOfKinName: member.nextofkinname,
      nextOfKinPhone: member.nextofkinphone,
      nextOfKinEmail: member.nextofkinemail,
      fellowshipCollege: member.fellowshipcollege,
      fwacs: member.fwacs,
      fmcs: member.fmcs,
      facs: member.facs,
      frcs: member.frcs,
      others: member.others,
      qualificationYear: member.qualificationyear,
      additionalQualification: member.additionalqualification,
      residencyTraining: member.residencytraining,
      foreignInstitution: member.foreigninstitution,
      conferenceAttended: member.conferenceattended,
      mbbsCertificate: member.mbbscertificate,
      fellowshipCertificate: member.fellowshipcertificate,
      membershipType: member.membershiptype,
      isActive: member.isactive,
      joinedDate: member.joineddate,
      profilePhoto: member.profilephoto,
      showInDirectory: member.showindirectory,
      createdAt: member.createdat
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// PUT update member profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email ? req.user.email.trim() : '';
    const {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      streetAddress,
      permanentAddress,
      currentPractice,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinEmail
    } = req.body;

    const { error } = await supabase
      .from('members')
      .update({
        firstname: firstName,
        middlename: middleName,
        lastname: lastName,
        phonenumber: phoneNumber,
        streetaddress: streetAddress,
        permanentaddress: permanentAddress,
        currentpractice: currentPractice,
        nextofkinname: nextOfKinName,
        nextofkinphone: nextOfKinPhone,
        nextofkinemail: nextOfKinEmail,
        updatedat: new Date()
      })
      .ilike('email', userEmail);

    if (error) throw error;

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// POST upload certificate (Cloudinary)
router.post('/certificates/upload', authenticateToken, uploadCertificate.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { certificateType } = req.body; // 'mbbs' or 'fellowship'
    const userEmail = req.user.email ? req.user.email.trim() : '';

    if (!['mbbs', 'fellowship'].includes(certificateType)) {
      return res.status(400).json({ message: 'Invalid certificate type. Use "mbbs" or "fellowship"' });
    }

    const certificateUrl = req.file.path;
    const column = certificateType === 'mbbs' ? 'mbbscertificate' : 'fellowshipcertificate';

    // Get current certificate to delete old one from Cloudinary
    const { data: member } = await supabase
      .from('members')
      .select(column)
      .ilike('email', userEmail)
      .maybeSingle();

    if (member && member[column]) {
      const oldPublicId = getPublicIdFromUrl(member[column]);
      if (oldPublicId) {
        const resourceType = member[column].includes('.pdf') ? 'raw' : 'image';
        await deleteFromCloudinary(oldPublicId, resourceType);
      }
    }

    // Update certificate URL in database
    const { error } = await supabase
      .from('members')
      .update({ [column]: certificateUrl })
      .ilike('email', userEmail);

    if (error) throw error;

    res.json({
      message: 'Certificate uploaded successfully',
      certificateUrl: certificateUrl,
      certificateType: certificateType
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ message: 'Error uploading certificate', error: error.message });
  }
});

// GET download certificate (redirects to the stored URL)
router.get('/certificates/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params; // 'mbbs' or 'fellowship'
    const userEmail = req.user.email ? req.user.email.trim() : '';

    if (!['mbbs', 'fellowship'].includes(type)) {
      return res.status(400).json({ message: 'Invalid certificate type' });
    }

    const column = type === 'mbbs' ? 'mbbscertificate' : 'fellowshipcertificate';

    // FIX: select the column by its plain name (the "as" alias is not valid here)
    const { data: member, error } = await supabase
      .from('members')
      .select(column)
      .ilike('email', userEmail)
      .maybeSingle();

    if (error) {
      console.error('Certificate lookup error:', error.message);
      return res.status(500).json({ message: 'Error looking up certificate' });
    }

    if (!member || !member[column]) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.redirect(member[column]);

  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ message: 'Error downloading certificate', error: error.message });
  }
});

// POST change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
      password: newPassword
    });

    if (error) throw error;

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
});

// GET member directory (public)
router.get('/directory', async (req, res) => {
  try {
    const { search, specialty } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('members')
      .select('membershipnumber, firstname, middlename, lastname, areaofspecialty, currentpractice, profilephoto, joineddate', { count: 'exact' })
      .eq('showindirectory', true)
      .eq('isactive', true);

    if (search) {
      query = query.or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,currentpractice.ilike.%${search}%`);
    }

    if (specialty) {
      query = query.ilike('areaofspecialty', `%${specialty}%`);
    }

    const { data: members, count, error } = await query
      .order('lastname', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      members: members || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching member directory:', error);
    res.status(500).json({ message: 'Error fetching member directory', error: error.message });
  }
});

// GET single member profile for directory (public)
router.get('/directory/:membershipNumber', async (req, res) => {
  try {
    const { membershipNumber } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select('membershipnumber, firstname, middlename, lastname, areaofspecialty, currentpractice, profilephoto, joineddate, fellowshipcollege, fwacs, fmcs, facs, frcs')
      .eq('membershipnumber', membershipNumber)
      .eq('showindirectory', true)
      .eq('isactive', true)
      .maybeSingle();

    if (error || !member) {
      return res.status(404).json({ message: 'Member not found or profile is private' });
    }

    res.json(member);

  } catch (error) {
    console.error('Error fetching member profile:', error);
    res.status(500).json({ message: 'Error fetching member profile', error: error.message });
  }
});

// GET verify member (public - for QR code verification)
router.get('/verify/:membershipNumber', async (req, res) => {
  try {
    const { membershipNumber } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select('membershipnumber, firstname, middlename, lastname, areaofspecialty, currentpractice, profilephoto, isactive, joineddate, membershiptype')
      .eq('membershipnumber', membershipNumber)
      .maybeSingle();

    if (error || !member) {
      return res.status(404).json({ verified: false, message: 'Member not found' });
    }

    res.json({
      verified: true,
      member
    });

  } catch (error) {
    console.error('Error verifying member:', error);
    res.status(500).json({ verified: false, message: 'Error verifying member' });
  }
});

module.exports = router;