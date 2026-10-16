import ContactSubmission from '../models/ContactSubmission.js';
import { sendContactEmail } from '../services/emailService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 6 * 60 * 60 * 1000;

export const submitContactMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length < 1 || message.length > 2000) {
    throw new ApiError(400, 'Message is required and must be between 1 and 2000 characters');
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const sentCount = await ContactSubmission.countDocuments({
    userId: req.user._id,
    status: 'sent',
    createdAt: { $gt: windowStart },
  });

  if (sentCount >= RATE_LIMIT_MAX) {
    throw new ApiError(429, 'You can send up to 3 messages every 6 hours. Please try again later.');
  }

  const submission = await ContactSubmission.create({
    userId: req.user._id,
    message,
    status: 'pending',
  });

  try {
    await sendContactEmail(req.user.email, req.user.username || req.user.email, message);
    submission.status = 'sent';
    await submission.save();
  } catch (error) {
    submission.status = 'failed';
    await submission.save();
    throw error;
  }

  res.status(200).json(new ApiResponse(200, null, "Message sent to the Streakies team. We'll get back to you soon."));
});
