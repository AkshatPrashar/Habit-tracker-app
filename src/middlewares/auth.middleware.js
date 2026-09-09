import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;
    if (!token) {
      throw new ApiError(401, 'No token provided');
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};
