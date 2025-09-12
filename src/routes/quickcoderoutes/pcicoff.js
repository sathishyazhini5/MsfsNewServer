import express from 'express';
import { createQuickCodePcicof,getPcicofTypeNames } from '../../controllers/Quickcodecontroller/pcicioff.js';

const router = express.Router();

router.post('/createPcicof',createQuickCodePcicof); 
router.get('/getPcicof',getPcicofTypeNames)

export const pcicoffRouter = router;
