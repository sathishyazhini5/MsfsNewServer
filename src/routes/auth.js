import { loginAdmin } from '../controllers/index.js';
import { login } from '../controllers/index.js';
import express from 'express';
const router = express.Router();

const path = '/auth';

router.post(`${path}/login`, login);

export const authRouter = router;