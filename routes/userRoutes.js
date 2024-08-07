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
router.get('/users/:user_id/profiles', getUserProfiles);
router.get('/users/:user_id/profiles/:id', getUserProfileById);
router.put('/users/:user_id/profiles/:id', upload.single('image'), upsertUserProfile);
router.delete('/users/:user_id/profiles/:id', deleteUserProfile);


module.exports = router;
