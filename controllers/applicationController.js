const ApplicationModel = require('../models/ApplicationModel');
const MemberModel = require('../models/MemberModel');
const path = require('path');

class ApplicationController {
  static async submitApplication(req, res) {
    try {
      console.log('Received application ', req.body); // DEBUG LOG
      console.log('Received files:', req.files); // DEBUG LOG
      
      const applicationData = req.body;
      
      // Validate required fields
      const requiredFields = [
        'firstName', 'lastName', 'areaOfSpecialty', 'phoneNumber', 'email',
        'streetAddress', 'permanentAddress', 'mdcnRegistrationNumber',
        'yearQualifiedMBBS', 'additionalQualificationMDCN', 'yearQualifiedUrologist',
        'currentPractice', 'nextOfKinName', 'nextOfKinPhone', 'nextOfKinEmail',
        'fellowshipCollege', 'qualificationYear', 'additionalQualification',
        'residencyTraining', 'declaration', 'date'
      ];

      for (const field of requiredFields) {
        if (!applicationData[field]) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }

      // Check if email already exists
      const existingApplication = await ApplicationModel.findByEmail(applicationData.email);
      if (existingApplication) {
        return res.status(400).json({ message: 'An application with this email already exists' });
      }

      // Handle file uploads
      let mbbsCertificatePath = null;
      let fellowshipCertificatePath = null;

      if (req.files) {
        if (req.files['mbbsCertificate'] && req.files['mbbsCertificate'][0]) {
          mbbsCertificatePath = req.files['mbbsCertificate'][0].path;
        }
        if (req.files['fellowshipCertificate'] && req.files['fellowshipCertificate'][0]) {
          fellowshipCertificatePath = req.files['fellowshipCertificate'][0].path;
        }
      }

      // Add document paths to application data
      applicationData.mbbsCertificate = mbbsCertificatePath;
      applicationData.fellowshipCertificate = fellowshipCertificatePath;

      console.log('Creating application with ', {
        ...applicationData,
        mbbsCertificate: mbbsCertificatePath ? 'FILE UPLOADED' : 'NO FILE',
        fellowshipCertificate: fellowshipCertificatePath ? 'FILE UPLOADED' : 'NO FILE'
      });

      // Create application
      const applicationId = await ApplicationModel.create(applicationData);

      console.log('Application created with ID:', applicationId);

      res.status(201).json({
        message: 'Application submitted successfully',
        applicationId
      });

    } catch (error) {
      console.error('Error submitting application:', error); // DEBUG LOG
      console.error('Error stack:', error.stack); // DEBUG LOG
      
      // Check if it's a multer error (file type issue)
      if (error.message.includes('Only image, PDF, and Word files are allowed')) {
        return res.status(400).json({ 
          message: 'File upload error: Only image, PDF, and Word files are allowed!' 
        });
      }
      
      // Return proper JSON error response
      res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  static async approveApplication(req, res) {
    try {
      const { id } = req.params;
      const { adminId, notes } = req.body;
      
      // Get application details
      const application = await ApplicationModel.findById(id);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ message: 'Application is not in pending status' });
      }

      // Generate new membership number
      const membershipNumber = await MemberModel.generateMembershipNumber();

      // Update application status
      const updated = await ApplicationModel.updateStatus(id, 'approved', adminId, notes);
      if (!updated) {
        return res.status(400).json({ message: 'Failed to update application status' });
      }

      // Update membership number in application
      await ApplicationModel.updateMembershipNumber(id, membershipNumber);

      // Create member record
      const memberData = {
        ...application,
        membershipNumber,
        hasAccount: false,
        accountCreated: null,
        membershipType: 'new'
      };

      await MemberModel.create(memberData);

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'Temp!';

      // Send email to applicant (using dynamic import to avoid circular dependency)
      const EmailService = require('../services/emailService');
      await EmailService.sendApprovalEmail(application.email, membershipNumber, tempPassword);

      res.json({
        message: 'Application approved successfully',
        membershipNumber,
        emailSent: true
      });

    } catch (error) {
      console.error('Error approving application:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getPendingApplications(req, res) {
    try {
      const applications = await ApplicationModel.findAll('pending');
      res.json(applications);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getAllApplications(req, res) {
    try {
      const { status } = req.query;
      const applications = await ApplicationModel.findAll(status);
      
      // Add membership number info for approved applications
      const applicationsWithNumbers = applications.map(app => ({
        ...app,
        hasMembershipNumber: !!app.membershipNumber
      }));
      
      res.json(applicationsWithNumbers);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const application = await ApplicationModel.findById(id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      res.json(application);
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async rejectApplication(req, res) {
    try {
      const { id } = req.params;
      const { adminId, notes } = req.body;
      
      const application = await ApplicationModel.findById(id);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ message: 'Application is not in pending status' });
      }

      const updated = await ApplicationModel.updateStatus(id, 'rejected', adminId, notes);
      if (!updated) {
        return res.status(400).json({ message: 'Failed to update application status' });
      }

      // Send rejection email
      const EmailService = require('../services/emailService');
      await EmailService.sendRejectionEmail(application.email, notes);

      res.json({ message: 'Application rejected successfully' });

    } catch (error) {
      console.error('Error rejecting application:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = ApplicationController;