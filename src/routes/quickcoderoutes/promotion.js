import express from 'express';
import { createQuickCodePromto,getPromtoTypeNames } from '../../controllers/Quickcodecontroller/Promotion.js';

const router = express.Router();

router.post('/createPromotion',createQuickCodePromto); 
router.get('/getPromotion',getPromtoTypeNames)

export const PromotionRouter = router;
