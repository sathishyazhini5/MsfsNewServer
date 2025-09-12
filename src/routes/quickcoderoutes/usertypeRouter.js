import express from 'express';
import { createQuickCodeuser,getUserTypeNames,getrollnames } from '../../controllers/Quickcodecontroller/usertype.js'

const router = express.Router();

router.post('/userquickcode',createQuickCodeuser); 
router.get('/getusertypes',getUserTypeNames)
router.get('/getrollnames',getrollnames)

export const usertypeRouter = router;
