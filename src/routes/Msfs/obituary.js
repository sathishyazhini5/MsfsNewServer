import express from 'express';
import { saveObituary, getObituaryData, getObituaryByCode, deleteObituary, updateObituaryByCode, saveObituaryByExcel, getObituary} from '../../controllers/Msfs/Obituary_dtl.js';
import excelupload from '../../middlewares/excel-multer.js';
import multer from 'multer';
const excelUpload = multer(); // in-memory for Azure

const router = express.Router();

// Route to save an obituary
router.post('/saveObituary', saveObituary);
router.get('/getAllObituaryData',getObituaryData)
router.get('/getObituaryByCode', getObituaryByCode);
router.delete('/deleteObituary/:obituary_code', deleteObituary);
router.put('/updateObituaryByCode/:obituary_code', updateObituaryByCode);
router.post('/saveObituaryByExcel', excelUpload.single('file'), saveObituaryByExcel)
router.get('/getObituary/:obituary_code',getObituary)

export const ObituaryRouter= router;