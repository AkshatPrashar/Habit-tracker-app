import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateAccessToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
};

export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password required');
  }

  const accessToken = generateAccessToken(email);
  const refreshToken = generateRefreshToken(email);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: refreshToken, email, expiresAt });

  res.status(201).json(
    new ApiResponse(201, { accessToken, refreshToken, email }, 'User registered successfully')
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password required');
  }

  const accessToken = generateAccessToken(email);
  const refreshToken = generateRefreshToken(email);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: refreshToken, email, expiresAt });

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken, email }, 'Login successful')
  );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token required');
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newAccessToken = generateAccessToken(decoded.email);

    res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed successfully')
    );
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: req.user }, 'User fetched successfully'));
});
