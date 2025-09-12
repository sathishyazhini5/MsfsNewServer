import express from 'express';
import { saveScholasticAdmisnPromonDetails, getScholasticsAdmisnPromonDetails, getScholasticsAdmisnPromonDetailsByCode,
    updateScholasticsAdmisnPromonDetails, deleteScholasticsAdmisnPromonDetails, getAdmissionPromonDetails,
    getScholasticDetailsbyAdmins,
    getDetailsByProvince,
    getScholasticsByProvince,
    
 } from '../../controllers/Msfs/scholastics_admisn.js';

const router = express.Router();

router.post('/savescholasticAdmisn', saveScholasticAdmisnPromonDetails);
router.get('/getScholasticsAdmisn', getScholasticsAdmisnPromonDetails);
router.get('/getScholasticsAdmisnByCode/:scholastics_admisn_code', getScholasticsAdmisnPromonDetailsByCode);
router.put('/updatescholasticAdmisn/:scholastics_admisn_code', updateScholasticsAdmisnPromonDetails);
router.delete('/deletescholasticAdmisn/:scholastics_admisn_code', deleteScholasticsAdmisnPromonDetails )
router.get('/getadmissionpromotion/:scholastics_admisn_code',getAdmissionPromonDetails)
router.get('/getScholasticDetailsbyAdmins/:scholastic_code',getScholasticDetailsbyAdmins)
router.get('/getDetailsByProvince/:province_code',getDetailsByProvince)
router.get('/getScholasticsByProvince',getScholasticsByProvince)


export const Scholastics_admisnRouter = router;