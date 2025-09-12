import express from 'express';
import { createQuickCodesct } from '../../controllers/Quickcodecontroller/scholastictype.js'
import { getScolasticnames } from '../../controllers/Quickcodecontroller/scholastictype.js';

const router = express.Router();

router.post('/schquickcode',createQuickCodesct); 
router.get('/getschtyp',getScolasticnames)

export const scholasticRouter = router;
