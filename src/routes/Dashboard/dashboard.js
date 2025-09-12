import express from 'express';
import { getDivisionCounts,getDivisionCountsforDash,getDivisionCountsforTokenProvince } from '../../controllers/Dashboard/dashboard.js';

const router = express.Router();


router.get('/division-counts', getDivisionCounts);

router.post('/getDivisionCountsforDash', getDivisionCountsforDash);
router.post('/getDivisionCountsforTokenProvince',getDivisionCountsforTokenProvince)


export const getDivisionCountsRouter = router;