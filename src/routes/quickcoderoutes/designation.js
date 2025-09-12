import express from 'express';
import { createQuickCode,getDestinationName,getDestinationNames } from '../../controllers/Quickcodecontroller/designationtype.js';

const router = express.Router();

router.post('/desquickcode',createQuickCode); 
router.get('/getDesignationNames',getDestinationNames)
router.get('/getDesignationNames/:province_code',getDestinationName)


export const designationRouter = router;
