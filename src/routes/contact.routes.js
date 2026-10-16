import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { submitContactMessage } from '../controllers/contact.controller.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', submitContactMessage);

export default router;
