import express from 'express';
import { createQuickCodeMandate,getMandateTypeNames } from '../../controllers/Quickcodecontroller/Mandate.js';

const router = express.Router();

router.post('/CreateMandate',createQuickCodeMandate); 
router.get('/getMandate',getMandateTypeNames)

export const MandateRouter = router;
