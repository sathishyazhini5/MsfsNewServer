import express from 'express';
import { createQuickCode,getCenterNames } from '../../controllers/Quickcodecontroller/centertype.js';

const router = express.Router();

router.post('/createcenter',createQuickCode); 
router.get('/getCenterNames',getCenterNames)

export const centreRouter = router;
