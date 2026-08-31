import express from 'express';
import { globalSearch } from '../controllers/globalSearch.js';
import { authenticate } from '../middlewares/authenticate.js';

export const globalSearchRouter = express.Router();
globalSearchRouter.get('/global-search', authenticate, globalSearch);
