import express from 'express';
import {saveScholasticDetail,getAllScholastics,getScholasticDetailByCode,deleteScholasticByCode,updateScholasticDetail, saveScholasticByExcel, getScholasticDetails, getAcademicDetailsByScholasticCode, getAllScholasticsForExport} from '../../controllers/Msfs/scholastics.js';
const router = express.Router();
import excelupload from '../../middlewares/excel-multer.js';
import multer from 'multer';
const excelUpload = multer(); // in-memory

router.post('/savescholastic',saveScholasticDetail)
router.get('/getAllScholastics',getAllScholastics)
router.get('/getbyScholasticsCode',getScholasticDetailByCode)
router.delete('/deleteScholastic/:scholastic_code',deleteScholasticByCode)
router.put('/scholastics/:scholastic_code', updateScholasticDetail);
router.post('/saveScholasticebyExcel', excelUpload.single('file'), saveScholasticByExcel);
router.get('/getScholasticDetails/:scholastic_code',getScholasticDetails)  //getalldata
router.get('/getacademicdetailsbyscholastics/:scholastic_code',getAcademicDetailsByScholasticCode)
router.get('/getAllScholasticsForExport',getAllScholasticsForExport)

export const ScholasticsRouter = router;