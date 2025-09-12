import express from 'express';
import { saveHeadquartersDetails, updateHeadquartersDetails, getHeadquartersDetails, deleteHeadquartersDetails,getDivisionNamesByProvinceAndType, getHeadquarters, getHeadquartersExportAll, getDivisionNamesByCodes } from '../../controllers/Msfs/headquarters.js';

const router = express.Router();

router.post('/saveheadquarters', saveHeadquartersDetails);
router.put('/updateheadquaters/:headquarters_code', updateHeadquartersDetails);
router.get('/getallheadquaters', getHeadquartersDetails );
router.get('/getDivisionNamesByProvinceAndType/:province_code/:division_type_code', getDivisionNamesByProvinceAndType);
router.delete('/deleteheadquaters/:headquarters_code', deleteHeadquartersDetails)
router.get ('/getheadquarters/:headquarters_code',getHeadquarters)
router.get('/getallExport',getHeadquartersExportAll)
router.get('/getDivisionNamesByCodes', getDivisionNamesByCodes);


export const headquartersRouter = router;