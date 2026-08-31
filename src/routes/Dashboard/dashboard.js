import express from 'express';
import { getDivisionCounts,getDivisionCountsforDash,getDivisionCountsforTokenProvince } from '../../controllers/Dashboard/dashboard.js';
import { getDashboardDetails } from '../../controllers/Dashboard/dashboardDetails.js';

const router = express.Router();


router.get('/division-counts', getDivisionCounts);

router.post('/getDivisionCountsforDash', getDivisionCountsforDash);
router.post('/getDivisionCountsforTokenProvince',getDivisionCountsforTokenProvince)
router.post('/dashboard-details', getDashboardDetails);


export const getDivisionCountsRouter = router;
