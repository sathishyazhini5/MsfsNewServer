import express from 'express';
import { saveConfrere, getNationalities, getAllConfreres, getConfrereDetails, getConfreres ,updateConfrere, deleteConfrere, getConfrereByCode,getConfrerebyprovinceandmember, getConfreresView, saveConfrereByExcel ,getConfrereByConfrere_code, getConfrere, } from '../../controllers/Msfs/confreres.js';
import upload from '../../middlewares/multer.js';
import excelupload from '../../middlewares/excel-multer.js';
import multer from 'multer';
import { authenticate } from '../../middlewares/authenticate.js';
const excelUpload = multer();


const router = express.Router();

// Route to save a new confrere with an image file upload
router.post('/saveConfrere', authenticate, excelUpload.single('image'), saveConfrere);

router.get('/getconfrereview',getConfreresView)

// Route to get a list of all nationalities
router.get('/getNationalities', getNationalities);

// Route to get all confreres details
router.get('/getAllConfreres', getConfreres);

// Route to get confrere details by province_code and member_type_code
router.get('/getConfrerebyprovinceandmember', getConfrerebyprovinceandmember);

// Route to get confrere details by confrer_code
router.get('/getConfrere/:confrer_code', getConfrereByCode);

router.get('/getConfrere_code/:confrer_code',getConfrereByConfrere_code)

// Route to update a confrere by confrer_code with an image file upload
router.put('/updateConfrere/:confrer_code', authenticate, excelUpload.single('image'), updateConfrere);

// Route to delete a confrere by confrer_code
router.delete('/deleteConfrere/:confrer_code', deleteConfrere);

router.post('/uploadExcel', authenticate, excelUpload.single('file'), saveConfrereByExcel)

router.get('/getConfrereData/:confrer_code',getConfrere)



export const ConfrereRouter = router;
