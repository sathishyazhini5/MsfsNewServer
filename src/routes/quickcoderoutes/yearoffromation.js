import express from 'express';
import { createQuickCodeYrform,getYrformTypeNames } from '../../controllers/Quickcodecontroller/yearofformation.js';

const router = express.Router();

router.post('/createYrform',createQuickCodeYrform); 
router.get('/getYrformTypeNames',getYrformTypeNames)

export const yearofformationRouter = router;
