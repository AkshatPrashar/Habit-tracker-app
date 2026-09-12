import express from 'express';
import { register, login, logout, getMe, refreshAccessToken, verifyEmail, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', verifyToken, getMe);

export default router;
