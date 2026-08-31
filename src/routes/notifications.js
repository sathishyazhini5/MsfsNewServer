import express from 'express';
import { notificationSummary } from '../controllers/notifications.js';
import { authenticate } from '../middlewares/authenticate.js';

export const notificationRouter = express.Router();
notificationRouter.get('/notifications/summary', authenticate, notificationSummary);
