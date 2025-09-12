import express from 'express';
import { saveApostolate,getApostolates,deleteApostolate,getApostolateNames,getCentreTypeNames,updateCentreTypeForApostolate, getApostolate, saveApostolateMapforcenterdetails, getApostolatebyprovince } from '../../controllers/Matsertables/apostolate.js';

const router = express.Router();

router.post('/saveapostolate',saveApostolate); 
router.get('/getApostolateandcenternames',getApostolates)
router.get('/getApostolateandcentername',getApostolate)
router.delete('/deletethedata',deleteApostolate)
router.get('/getApostolateNames',getApostolateNames)
router.get('/getCentreTypeNames',getCentreTypeNames)
router.put('/updateCentreTypeForApostolate',updateCentreTypeForApostolate)
router.post('/saveApostolateMapforcenterdetails',saveApostolateMapforcenterdetails)
router.get('/getApostolatebyprovince',getApostolatebyprovince)


export const apostolateRouter = router;
