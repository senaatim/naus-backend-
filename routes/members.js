const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllMembers,
  getMemberById,
  updateMember,
  toggleMemberStatus,
  searchMembers,
  deleteMember
} = require('../controllers/memberManagementController');

// All routes require authentication
router.use(authenticateToken);

// Member management routes
router.get('/', getAllMembers);
router.get('/search', searchMembers);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.patch('/:id/status', toggleMemberStatus);
router.delete('/:id', deleteMember);

module.exports = router;