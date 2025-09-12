import express from 'express';
import { createQuickCodeFormationType,getFormationTypeNames } from '../../controllers/Quickcodecontroller/formationtype.js';

const router = express.Router();

router.post('/createFormation',createQuickCodeFormationType); 
router.get('/getFormationNames',getFormationTypeNames)

export const FormationRouter = router;
