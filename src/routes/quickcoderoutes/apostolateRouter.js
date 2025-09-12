import express from 'express';
import { createQuickCodeApostl,getApostlTypeNames } from '../../controllers/Quickcodecontroller/apostltype.js';

const router = express.Router();

router.post('/createQuickCodeApostl',createQuickCodeApostl); 
router.get('/getApostlTypeNames',getApostlTypeNames)

export const ApostlRouter = router;
