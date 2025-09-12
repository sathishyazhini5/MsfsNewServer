import express from 'express';
import { saveCentreDetails, getCentreDetails,getCentreDetailsByCode, updateCentreDetails, deleteCentreDetails,getPlaceofCentreDetails, getCentresByPlace, saveCentreDetailsByExcel, getcenterdetails, getCentreDetail, getAllCentreDetailsForExport }
 from '../../controllers/Msfs/centre.js';
 import excelupload from '../../middlewares/excel-multer.js';

const router = express.Router();

router.post('/savecentredetails', saveCentreDetails);
router.get('/getcenterdetails', getCentreDetails);
router.get('/getcenterdetails/:province_code', getCentreDetail);
router.get('/getcenterdetailsbycode/:centre_code', getCentreDetailsByCode)
router.get('/getPlaceofCentreDetails', getPlaceofCentreDetails);
router.put('/updatecentredetails/:centre_code', updateCentreDetails );
router.delete('/deletecentredetails/:centre_code', deleteCentreDetails);
router.get('/getCentreNameByPlace/:centre_place', getCentresByPlace);
router.post('/savecentrebyExcel', excelupload.single('file'), saveCentreDetailsByExcel);
router.get('/getcentredetails/:centre_code',getcenterdetails)
router.get('/getAllCentreDetailsForExport',getAllCentreDetailsForExport)



export const CentreRouter2 = router;
