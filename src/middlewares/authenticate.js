import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { HttpException } from '../exceptions/HttpException.js';
import { JWT_SECRET } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
    try {
        console.log("Request Headers:", req.headers);

        const tokenString = req.cookies.auth ||
            (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);

        console.log('Extracted Token:', tokenString); // Log the extracted token

        if (!tokenString) {
            logger.warn("Token not provided in request headers.");
            return next(new HttpException(StatusCodes.UNAUTHORIZED, 'Token not provided.'));
        }

        try {
            console.log('JWT_SECRET during verification:', JWT_SECRET); // Debugging Secret
            // Decode without verification for debugging purposes
            const decoded = jwt.decode(tokenString, { complete: true });
            console.log('Decoded Token without Verification:', decoded);

            // Verify token using JWT_SECRET
            const tokenData = jwt.verify(tokenString, JWT_SECRET);
            console.log("Token Data (Decoded):", tokenData);

            // Continue with user validation
            res.locals.user = tokenData; // Ensure user data is set correctly
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                logger.error('Token expired at:', err.expiredAt);
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token expired, please login again.' });
            }

            logger.error('Token verification error:', err.message);
            next(new HttpException(StatusCodes.UNAUTHORIZED, 'Invalid token.'));
        }
    } catch (error) {
        logger.error('Unexpected error during authentication:', error.message);
        next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Authentication failed.'));
    }
};
