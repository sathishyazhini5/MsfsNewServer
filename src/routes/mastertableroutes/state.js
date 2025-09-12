import express from 'express';

import { saveStateData, getStateData, deleteStateData, getStatesByCountryCode, getStatesByCountrybyProvince  } from '../../controllers/Matsertables/State.js';

const router = express.Router();

router.post('/savestatedata',saveStateData)
router.get('/getStateData',getStateData)
router.delete('/deletestatedata', deleteStateData);
router.get('/getstateDataByCode/:country_code', getStatesByCountryCode)
router.get('/getstateDatabyProvince',getStatesByCountrybyProvince, )

export const StateRouter = router;

