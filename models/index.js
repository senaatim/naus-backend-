const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define Admin model
const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'membership_admin', 'content_admin'),
    defaultValue: 'membership_admin'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'admins',
  timestamps: true
});

// Define Application model
const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  middleName: DataTypes.STRING,
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  areaOfSpecialty: DataTypes.STRING,
  phoneNumber: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  streetAddress: DataTypes.TEXT,
  permanentAddress: DataTypes.TEXT,
  mdcnRegistrationNumber: DataTypes.STRING,
  yearQualifiedMBBS: DataTypes.INTEGER,
  additionalQualificationMDCN: DataTypes.STRING,
  yearQualifiedUrologist: DataTypes.INTEGER,
  currentPractice: DataTypes.STRING,
  nextOfKinName: DataTypes.STRING,
  nextOfKinPhone: DataTypes.STRING,
  nextOfKinEmail: DataTypes.STRING,
  fellowshipCollege: DataTypes.STRING,
  fwacs: DataTypes.BOOLEAN,
  fmcs: DataTypes.BOOLEAN,
  facs: DataTypes.BOOLEAN,
  frcs: DataTypes.BOOLEAN,
  others: DataTypes.BOOLEAN,
  qualificationYear: DataTypes.INTEGER,
  additionalQualification: DataTypes.STRING,
  residencyTraining: DataTypes.TEXT,
  foreignInstitution: DataTypes.STRING,
  conferenceAttended: DataTypes.STRING,
  declaration: DataTypes.TEXT,
  date: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'under_review'),
    defaultValue: 'pending'
  },
  reviewedBy: DataTypes.INTEGER,
  reviewedAt: DataTypes.DATE,
  adminNotes: DataTypes.TEXT,
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'not_paid'),
    defaultValue: 'not_paid'
  },
  membershipNumber: DataTypes.STRING,
  mbbsCertificate: DataTypes.STRING,
  fellowshipCertificate: DataTypes.STRING
}, {
  tableName: 'applications',
  timestamps: true
});

// Define Member model
const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  membershipNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  middleName: DataTypes.STRING,
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  areaOfSpecialty: DataTypes.STRING,
  phoneNumber: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  streetAddress: DataTypes.TEXT,
  permanentAddress: DataTypes.TEXT,
  mdcnRegistrationNumber: DataTypes.STRING,
  yearQualifiedMBBS: DataTypes.INTEGER,
  additionalQualificationMDCN: DataTypes.STRING,
  yearQualifiedUrologist: DataTypes.INTEGER,
  currentPractice: DataTypes.STRING,
  nextOfKinName: DataTypes.STRING,
  nextOfKinPhone: DataTypes.STRING,
  nextOfKinEmail: DataTypes.STRING,
  fellowshipCollege: DataTypes.STRING,
  fwacs: DataTypes.BOOLEAN,
  fmcs: DataTypes.BOOLEAN,
  facs: DataTypes.BOOLEAN,
  frcs: DataTypes.BOOLEAN,
  others: DataTypes.BOOLEAN,
  qualificationYear: DataTypes.INTEGER,
  additionalQualification: DataTypes.STRING,
  residencyTraining: DataTypes.TEXT,
  foreignInstitution: DataTypes.STRING,
  conferenceAttended: DataTypes.STRING,
  declaration: DataTypes.TEXT,
  date: DataTypes.DATE,
  mbbsCertificate: DataTypes.STRING,
  fellowshipCertificate: DataTypes.STRING,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  joinedDate: DataTypes.DATE,
  expiryDate: DataTypes.DATE,
  membershipType: {
    type: DataTypes.ENUM('existing', 'new'),
    defaultValue: 'new'
  },
  hasAccount: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accountCreated: DataTypes.DATE
}, {
  tableName: 'members',
  timestamps: true
});

// Export models
module.exports = {
  sequelize,
  Admin,
  Application,
  Member
};