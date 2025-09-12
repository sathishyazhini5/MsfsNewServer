import express from 'express';
import { createQuickCode, getQuickCodeNames, updateQuickCode, deleteQuickCode } from '../../controllers/Quickcodecontroller/depaturetype.js';

const router = express.Router();

router.post('/quickcode', createQuickCode); 
router.get('/getquickcodes', getQuickCodeNames);
router.put('/updatequickcode', updateQuickCode);  // Ensure this line is correct
router.delete('/deletequickcode', deleteQuickCode);

export const depaturerouter = router;
