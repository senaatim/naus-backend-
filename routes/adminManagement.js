const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getCurrentAdmin,
  updateCurrentAdmin,
  changePassword
} = require('../controllers/adminManagementController');

// All routes require authentication
router.use(authenticateToken);

// Admin CRUD routes
router.get('/admins', getAllAdmins);
router.get('/admins/:id', getAdminById);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

// Profile routes
router.get('/profile', getCurrentAdmin);
router.put('/profile', updateCurrentAdmin);

// Password management
router.post('/change-password', changePassword);

module.exports = router;
