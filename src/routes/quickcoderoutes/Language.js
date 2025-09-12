import express from 'express';
import { getLanguagedetails,createLanguageMetadata,getLanguageMetadata,getLanguageNames } from '../../controllers/Quickcodecontroller/Language.js';

const router = express.Router();

router.post('/createLanguage',createLanguageMetadata); 
router.get('/getLanguagedetails',getLanguagedetails)
router.get('/getlanguagemetadata',getLanguageMetadata)
router.get('/getlanguages',getLanguageNames)

export const LanguageRouter = router;
