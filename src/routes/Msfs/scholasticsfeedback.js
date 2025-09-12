import express from 'express';
import { createScholasticFeedback, deleteScholasticFeedback, getAllScholasticFeedback, updateScholasticFeedback, upload } from '../../controllers/Msfs/scholasticsfeedback.js'; // Adjust the path as necessary

const router = express.Router();

import multer from 'multer';

// Use memory storage (same as confrere feedback)
const excelUpload = multer();
// POST route to create scholastic feedback
router.post('/scholastic-feedback/:scholastic_code', excelUpload.single('uploaded_file'),createScholasticFeedback);

router.put('/scholastic-feedback/:scholastic_feedback_code/:scholastic_feedback_seq_no', excelUpload.single('uploaded_file'), updateScholasticFeedback);

router.get('/scholasticGetfeedback/:scholastic_feedback_code/:scholastic_feedback_seq_no', getAllScholasticFeedback);

router.delete('/scholasticDeletefeedback/:scholastic_feedback_code/:scholastic_feedback_seq_no', deleteScholasticFeedback);
// Export the router
export const ScholasticsFeedbackRouter=router;
