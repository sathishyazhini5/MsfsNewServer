import express from 'express';
import { createdivisiontyp,getDivisionNames } from '../../controllers/Quickcodecontroller/divisiontype.js';

const router = express.Router();

router.post('/createdivisiontyp',createdivisiontyp); 
router.get('/getdivisionnames',getDivisionNames)

export const divisiontypeRouter = router;
