import express from 'express';
import { createProvince,getProvincesdetails, getProvinces, deleteProvince, updateProvince ,getConfrereDetails,
     getAcademicYearByProvinceCode , getProvinceByLogin,  
     getConcretion} from '../../controllers/Matsertables/Province.js'; // Ensure correct path
import { authenticate } from '../../middlewares/authenticate.js';
const router = express.Router();

router.post('/SaveProvince', authenticate, createProvince);

// Route to get all provinces
router.get('/GetProvinces', getProvinces);

router.get('/getConcretion/:concretion_code', getConcretion);


router.get('/Getdetailsofprovinces',getProvincesdetails)

// Route to delete a province
router.delete('/DeleteProvince/:province_code', deleteProvince);

router.get('/getConfrereDetails/:province_code', getConfrereDetails)

router.put('/updateProvince/:province_code', updateProvince);

router.get('/getacademicyearbyProvince/:province_code', getAcademicYearByProvinceCode);

router.get('/getprovincebylogin',getProvinceByLogin)

export const provinceRouter = router; // Ensure the export name is correct