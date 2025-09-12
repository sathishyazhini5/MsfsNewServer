import express from 'express';
import { saveDepartureDetails, getAllDepartures, getDepartureByCode,  deleteDepartureByCode,updateDepartureDetails, getDeparture} from '../../controllers/Msfs/departures_dtl.js';

const router = express.Router();

router.post('/saveDeparture', saveDepartureDetails);
router.get('/getDeparture', getAllDepartures);
router.get('/getDeparturebycode', getDepartureByCode);
router.put('/updateDepartureDetails', updateDepartureDetails);
router.delete('/deleteDeparture/:departure_code', deleteDepartureByCode);
router.get('/getDepartures/:departure_code',getDeparture)


export const DepartureRouter = router;

