import jwt from 'jsonwebtoken';
import { IUser } from '../models/userModel';
import logger from '../utils/logger';

/**
 * JWT token payload interface
 */
interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT token for a user
 * @param user User object
 * @returns JWT token
 */
export const generateToken = (user: IUser): string => {
  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });

  return token;
};

/**
 * Verify and decode JWT token
 * @param token JWT token
 * @returns Decoded token payload
 */
export const verifyToken = async (token: string): Promise<JwtPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err, decoded) => {
        if (err) {
          logger.error('JWT verification failed:', err);
          reject('Invalid token. Please log in again.');
        } else {
          resolve(decoded as JwtPayload);
        }
      }
    );
  });
};

/**
 * Create and send token as cookie
 * @param user User object
 * @param statusCode HTTP status code
 * @param res Express response object
 * @param message Optional message
 */
export const createSendToken = (
  user: IUser,
  statusCode: number,
  res: any,
  message?: string
) => {
  const token = generateToken(user);

  // Remove password from output
  user.password = undefined;

  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + 
      (parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '90') * 24 * 60 * 60 * 1000)
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  // Send cookie
  res.cookie('jwt', token, cookieOptions);

  // Send response
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
    message,
  });
};