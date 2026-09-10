import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendVerificationEmail, sendLoginNotificationEmail, sendLogoutNotificationEmail, sendForgotPasswordEmail } from '../services/emailService.js';

export const register = asyncHandler(async (req, res) => {
  try {
    console.log('📝 Register: Starting registration...');
    const { email, password, username, fullName } = req.body;
    console.log('📝 Register: Got user data');

    if (!email || !password || !username) {
      throw new ApiError(400, 'Email, password, and username are required');
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new ApiError(409, 'Email or username already exists');
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      username: username.toLowerCase(),
      fullName: fullName || username,
    });

    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = new Date(tokenExpiry);

    await user.save();
    console.log('📝 Register: User saved');

    const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${unHashedToken}`;
    console.log('📝 Register: Sending verification email...');
    await sendVerificationEmail(email, verificationLink);
    console.log('📝 Register: Email sent');

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    res.status(201).json(
      new ApiResponse(201, { accessToken, refreshToken, user: { _id: user._id, email: user.email, username: user.username } }, 'User registered successfully. Check your email for verification link.')
    );
  } catch (error) {
    console.error('❌ Register Error:', error);
    throw error;
  }
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;

  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Email verified successfully'));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

  user.refreshToken = refreshToken;
  await user.save();

  await sendLoginNotificationEmail(user.email);

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken, user: { _id: user._id, email: user.email, username: user.username } }, 'Login successful')
  );
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const userId = req.user?._id;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      await sendLogoutNotificationEmail(user.email);
    }
  }

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    const newAccessToken = user.generateAccessToken();

    res.status(200).json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed successfully'));
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = new Date(tokenExpiry);

  await user.save();

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${unHashedToken}`;
  await sendForgotPasswordEmail(email, resetLink);

  res.status(200).json(new ApiResponse(200, null, 'Password reset link sent to your email'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.password = newPassword;
  user.forgotPasswordToken = null;
  user.forgotPasswordExpiry = null;

  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Password reset successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken -forgotPasswordToken -emailVerificationToken');
  res.status(200).json(new ApiResponse(200, { user }, 'User fetched successfully'));
});
