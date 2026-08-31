import express from 'express';
import {saveScholasticDetail,getAllScholastics,getScholasticDetailByCode,deleteScholasticByCode,updateScholasticDetail, saveScholasticByExcel, getScholasticDetails, getAcademicDetailsByScholasticCode, getAllScholasticsForExport} from '../../controllers/Msfs/scholastics.js';
const router = express.Router();
import excelupload from '../../middlewares/excel-multer.js';
import multer from 'multer';
import { authenticate } from '../../middlewares/authenticate.js';
const excelUpload = multer(); // in-memory

router.post('/savescholastic',authenticate,saveScholasticDetail)
router.get('/getAllScholastics',getAllScholastics)
router.get('/getbyScholasticsCode',getScholasticDetailByCode)
router.delete('/deleteScholastic/:scholastic_code',deleteScholasticByCode)
router.put('/scholastics/:scholastic_code', authenticate, updateScholasticDetail);
router.post('/saveScholasticebyExcel', authenticate, excelUpload.single('file'), saveScholasticByExcel);
router.get('/getScholasticDetails/:scholastic_code',getScholasticDetails)  //getalldata
router.get('/getacademicdetailsbyscholastics/:scholastic_code',getAcademicDetailsByScholasticCode)
router.get('/getAllScholasticsForExport',getAllScholasticsForExport)

export const ScholasticsRouter = router;
