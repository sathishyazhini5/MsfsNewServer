import { StatusCodes } from 'http-status-codes';
import { compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { HttpException } from '../../exceptions/HttpException.js';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET, EXPIRY_TIME } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
const { sign } = jwt;
export const loginAdmin = async (req, res, next) => {
    const prisma = new PrismaClient();
    try {
        const { mobile_number, password } = req.body;
        const role = 'admin';
        const UNAUTHORIZED_MESSAGE = 'Incorrect Mobile Number or password.';
        if (!mobile_number || !password) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid mobile number or password!');
        }
        // Check if user with given number exists
        const user = await prisma.mobileNumber.findFirst({ where: { mobile_number, role } });
        if (!user)
            throw new HttpException(StatusCodes.UNAUTHORIZED, UNAUTHORIZED_MESSAGE);
        // Using bcrypt algo, check if the given password when encrypted matches with the saved password hash
        const isPasswordMatching = await compare(password, user.password);
        if (!isPasswordMatching)
            throw new HttpException(StatusCodes.UNAUTHORIZED, UNAUTHORIZED_MESSAGE);
        // Create JWT token
        const tokenData = { userId: user.id, role: user.role };
        const expiresIn = parseInt(EXPIRY_TIME);
        const token = sign(tokenData, JWT_SECRET, { expiresIn });
        const { password: dbPassword, ...rest } = user;
        const responseData = rest;
        await prisma.$disconnect();
        res.status(StatusCodes.OK).json({ data: responseData, token, message: 'success' });
    }
    catch (error) {
        await prisma.$disconnect();
        logger.error(error.message);
        next(new HttpException(error.status, error.status ? error.message : 'Failed to login'));
    }
};