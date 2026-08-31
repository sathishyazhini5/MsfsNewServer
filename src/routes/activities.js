import express from 'express';
import { allActivities, recentActivities } from '../controllers/activities.js';
import { authenticate } from '../middlewares/authenticate.js';

export const activityRouter = express.Router();
activityRouter.get('/activities/recent', authenticate, recentActivities);
activityRouter.get('/activities', authenticate, allActivities);
