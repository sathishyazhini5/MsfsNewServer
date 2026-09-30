import { saveOfficeType } from '../../controllers/Quickcodecontroller/officeTypes.js';
import express from 'express';
import { getPcicofTypeNames } from '../../controllers/Quickcodecontroller/pcicioff.js';

const router = express.Router();

router.post('/createPcicof', (req, res) => { req.params.kind = 'pcic'; return saveOfficeType(req, res); });
router.get('/getPcicof',getPcicofTypeNames)

export const pcicoffRouter = router;
