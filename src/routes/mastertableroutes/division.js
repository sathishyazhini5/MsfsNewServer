import express from 'express';
import { saveDivisionSetup,getDivisions,updateDivisionSetup,deleteDivisionSetup, getDivisionByProvinceAndType } from '../../controllers/Matsertables/Division.js';

const router = express.Router();

router.post('/SaveDivision', saveDivisionSetup);
router.get('/GetDivisions', getDivisions);
router.put('/UpdateDivision/:province_code/:division_type_code/:division_code', updateDivisionSetup);
router.delete('/DeleteDivision/:province_code/:division_type_code/:division_code', deleteDivisionSetup);
router.get('/getdivisionByprovinceandtype/:province_code/:division_type_code', getDivisionByProvinceAndType )


export const DivisionRouter = router; // Ensure the export name is correct