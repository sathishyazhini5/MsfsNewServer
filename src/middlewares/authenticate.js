import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { HttpException } from '../exceptions/HttpException.js';
import { JWT_SECRET } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
    try {
        const tokenString = req.cookies.auth ||
            (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);

        if (!tokenString) {
            logger.warn("Token not provided in request headers.");
            return res.status(StatusCodes.UNAUTHORIZED).json({
                code: 'AUTH_REQUIRED',
                message: 'Authentication is required.',
            });
        }

        try {
            const tokenData = jwt.verify(tokenString, JWT_SECRET);
            res.locals.user = tokenData;
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                logger.error('Token expired at:', err.expiredAt);
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    code: 'TOKEN_EXPIRED',
                    message: 'Your session has expired. Please login again.',
                });
            }

            logger.error('Token verification error:', err.message);
            return res.status(StatusCodes.UNAUTHORIZED).json({
                code: 'INVALID_TOKEN',
                message: 'Invalid authentication token.',
            });
        }
    } catch (error) {
        logger.error('Unexpected error during authentication:', error.message);
        next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Authentication failed.'));
    }
};
