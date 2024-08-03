const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getUsers,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
} = require('../controllers/userController');

const upload = multer({ dest: 'uploads/posts' });

router.get('/users', getUsers);

router.get('/profiles', getUserProfiles);
router.get('/profiles/:user_id', getUserProfileById);
router.post('/profiles', upload.single('image'), upsertUserProfile);
router.delete('/profiles/:user_id', deleteUserProfile);

module.exports = router;
