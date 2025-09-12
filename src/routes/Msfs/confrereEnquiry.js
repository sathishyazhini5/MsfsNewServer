import express from 'express';
import { CenterReportdata, filterConfreres, getAllProvinceFilters, getCenterReportdata, getComprehensiveConfrereReport, getDivisionCounts } from '../../controllers/Msfs/ConfrereEnquiry.js';


const router = express.Router();


router.get ('/getfilterConfreres',filterConfreres)

router.get('/getCenterReportdata',getCenterReportdata);

router.get('/getOverallData', getDivisionCounts);

router.get('/getALLcenterReport',CenterReportdata)

router.get('/getAllProvinceFilters',getAllProvinceFilters)

router.get("/getConfrereReport", getComprehensiveConfrereReport);

export const confrerEnquiryRouter = router;
