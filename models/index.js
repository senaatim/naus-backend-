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
    type: DataTypes.ENUM('super_admin', 'admin', 'moderator'),
    defaultValue: 'admin'
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
  areaOfSpecialty: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  streetAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  permanentAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mdcnRegistrationNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearQualifiedMBBS: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  additionalQualificationMDCN: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearQualifiedUrologist: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currentPractice: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fellowshipCollege: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fwacs: DataTypes.BOOLEAN,
  fmcs: DataTypes.BOOLEAN,
  facs: DataTypes.BOOLEAN,
  frcs: DataTypes.BOOLEAN,
  others: DataTypes.BOOLEAN,
  qualificationYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  additionalQualification: {
    type: DataTypes.STRING,
    allowNull: false
  },
  residencyTraining: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  foreignInstitution: DataTypes.STRING,
  conferenceAttended: DataTypes.STRING,
  declaration: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
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
  areaOfSpecialty: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  streetAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  permanentAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mdcnRegistrationNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearQualifiedMBBS: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  additionalQualificationMDCN: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearQualifiedUrologist: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currentPractice: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nextOfKinEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fellowshipCollege: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fwacs: DataTypes.BOOLEAN,
  fmcs: DataTypes.BOOLEAN,
  facs: DataTypes.BOOLEAN,
  frcs: DataTypes.BOOLEAN,
  others: DataTypes.BOOLEAN,
  qualificationYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  additionalQualification: {
    type: DataTypes.STRING,
    allowNull: false
  },
  residencyTraining: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  foreignInstitution: DataTypes.STRING,
  conferenceAttended: DataTypes.STRING,
  declaration: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
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