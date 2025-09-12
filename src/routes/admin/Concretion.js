import express from 'express';
import { createConcretion , deleteConcretion, getConcretions,updateConcretion } from '../../controllers/Admin/concrertion.js';
import { authenticate } from '../../middlewares/authenticate.js';
const router = express.Router();

// Route to create a new concretion and map it to a province
router.post('/createConcretion', authenticate,createConcretion);
router.get('/getConcretions',getConcretions)
router.put('/updateConcretion/:concretion_code',updateConcretion)
router.delete('/concretion/:concretion_code', deleteConcretion);

export const concertionRouter = router;
