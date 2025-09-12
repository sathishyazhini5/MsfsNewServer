import express from 'express';
import { createQuickCodeAnityp,getAnitypTypeNames } from '../../controllers/Quickcodecontroller/anniversarytypes.js';

const router = express.Router();

router.post('/createanniversary',createQuickCodeAnityp); 
router.get('/getAnitypTypeNames',getAnitypTypeNames)

export const AnniversarytypeRouter = router;
