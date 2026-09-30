import { getOfficeTypes, saveOfficeType, routeOfficeMutation } from '../../controllers/Quickcodecontroller/officeTypes.js';
import express from 'express';
import { createQuickCode, getQuickCodeNames, updateQuickCode, deleteQuickCode } from '../../controllers/Quickcodecontroller/depaturetype.js';

const router = express.Router();

router.get('/office-types', getOfficeTypes);
router.post('/office-types/:kind', saveOfficeType);
router.put('/office-types/:kind/:code', saveOfficeType);

router.post('/quickcode', routeOfficeMutation, createQuickCode);
router.get('/getquickcodes', getQuickCodeNames);
router.put('/updatequickcode', routeOfficeMutation, updateQuickCode);  // Ensure this line is correct
router.delete('/deletequickcode', deleteQuickCode);

export const depaturerouter = router;
