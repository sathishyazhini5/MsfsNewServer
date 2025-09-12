import express from 'express';
import {
    createDateFormatMetadata,
    getDateFormatNameandQuickCode,
    updateDateFormatMetadata,
    getDateFormatMetadata,
    getDateFormatDetails,
    getDateFormatNames
    // deleteDateFormatMetadata,
   
  } from '../../controllers/Metadata/dateformat.js';

const router = express.Router();
router.post('/createDateFormatMetadata', createDateFormatMetadata);
router.get('/getDateFormatNameandQuickCode',getDateFormatNameandQuickCode)
router.put('/updateDateFormatMetadata/:id', updateDateFormatMetadata);
router.get('/getDateFormatMetadata', getDateFormatMetadata);
router.get('/getDateFormatDetails', getDateFormatDetails);
// router.delete('/deleteDateFormatMetadata',deleteDateFormatMetadata)
router.get('/getDateFormatNames', getDateFormatNames);


export const DateRouter = router;
