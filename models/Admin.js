const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String,
    enum: ['super_admin', 'membership_admin', 'content_admin'],
    default: 'membership_admin'
  },
  permissions: {
    manageMembers: { type: Boolean, default: false },
    approveApplications: { type: Boolean, default: false },
    manageContent: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);