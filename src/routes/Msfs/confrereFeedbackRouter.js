import express from 'express';

import { saveConfrereFeedback,getDesignationByConfrerCodeinAppointTsf,updateConfrereFeedback ,deleteConfrereFeedback} from '../../controllers/Msfs/confrereFeedback.js';
import upload from '../../middlewares/multer.js';
import excelupload from '../../middlewares/excel-multer.js';
import multer from 'multer';
const excelUpload = multer();

const router = express.Router();

router.post('/saveFeedback/:confrer_code/:province_code', excelUpload.single('feedback_file'), saveConfrereFeedback);

router.get('/getDesignationByAppointTsf/:confrer_code',getDesignationByConfrerCodeinAppointTsf)
router.put('/updateFeedback/:confrer_feedback_seq_no/:confrer_code/:province_code', excelUpload.single('feedback_file'), updateConfrereFeedback);
router.delete('/DeleteConfrereFedback/:confrer_code/:confrer_feedback_seq_no',deleteConfrereFeedback)


export const confrereFeedbackRouter = router;
