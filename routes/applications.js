const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../config/supabase');

// Configure multer for memory storage (so we can upload directly to Supabase Storage bucket)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', upload.fields([
    { name: 'mbbsCertificate', maxCount: 1 },
    { name: 'fellowshipCertificate', maxCount: 1 }
]), async (req, res) => {
    try {
        const body = req.body;
        const files = req.files;

        if (!files?.mbbsCertificate || !files?.fellowshipCertificate) {
            return res.status(400).json({ error: 'Both MBBS and Fellowship certificates are required' });
        }

        // Upload certificates to Supabase Storage Bucket ('certificates')
        const uploadToSupabaseStorage = async (file) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            const { data, error } = await supabase.storage
                .from('certificates')
                .upload(fileName, file.buffer, { contentType: file.mimetype });

            if (error) throw error;
            
            const { data: publicUrlData } = supabase.storage
                .from('certificates')
                .getPublicUrl(fileName);

            return publicUrlData.publicUrl;
        };

        const mbbsUrl = await uploadToSupabaseStorage(files.mbbsCertificate[0]);
        const fellowshipUrl = await uploadToSupabaseStorage(files.fellowshipCertificate[0]);

        // Insert into Supabase applications table
        const { data, error } = await supabase
            .from('applications')
            .insert([{
                firstname: body.firstName,
                lastname: body.lastName,
                email: body.email,
                phonenumber: body.phoneNumber,
                mdcnregistrationnumber: body.mdcnRegistrationNumber,
                status: 'pending',
                mbbscertificate: mbbsUrl,
                fellowshipcertificate: fellowshipUrl
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Application submitted successfully', data });
    } catch (err) {
        console.error('Application submission error:', err);
        res.status(500).json({ message: 'Failed to submit application.', error: err.message });
    }
});

module.exports = router;