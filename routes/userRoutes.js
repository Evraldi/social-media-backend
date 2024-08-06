const express = require('express');
const multer = require('multer');
const {
    getUsers,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
} = require('../controllers/userController');

const router = express.Router();

const upload = multer({ dest: 'uploads/profiles' });

router.get('/users', getUsers);
router.get('/profiles', getUserProfiles);
router.get('/profiles/:id', getUserProfileById);
router.put('/profiles/:id', upload.single('image'), upsertUserProfile);
router.delete('/profiles/:id', deleteUserProfile);

module.exports = router;
