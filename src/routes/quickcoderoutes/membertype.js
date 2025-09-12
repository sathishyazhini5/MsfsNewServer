import express from 'express';
import { createQuickCodeMember,getMemberbyprovince,getMemberTypeNames } from '../../controllers/Quickcodecontroller/membertype.js';

const router = express.Router();

router.post('/createMemberType',createQuickCodeMember); 
router.get('/getMemberTypes',getMemberTypeNames)
router.get('/getmemberbyprovince',getMemberbyprovince)

export const membertypeRouter = router;
