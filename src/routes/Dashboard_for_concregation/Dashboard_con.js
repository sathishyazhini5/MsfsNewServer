import express from 'express';
import { getProvincesByConcretionCode,getConcretionByLogin,getProvincesForConcretion,
    getConcretionCounts,getProvinceCountsByConcretion,getAllConcretions, getDivisionCountsByConcretion, getDivisionCountsforTokenConcretion,getProvincesForTokenConcretion
 } from '../../controllers/Dashboard_for_concregation/Dashboard_con.js';

const router = express.Router();

router.get('/getprovincesbyconcretion/:concretionCode', getProvincesByConcretionCode);
router.get('/getConcretionByLogin', getConcretionByLogin);
router.get("/provinces-for-concretion", getProvincesForConcretion);
router.get("/getConcretionCounts", getConcretionCounts);
router.get("/getProvinceCountsByConcretion", getProvinceCountsByConcretion);
router.get("/getAllConcretions", getAllConcretions);
router.get("/getDivisionCountsByConcretion", getDivisionCountsByConcretion);
router.get("/getDivisionCountsforTokenConcretion", getDivisionCountsforTokenConcretion);
router.get("/getProvincesForTokenConcretion",getProvincesForTokenConcretion)

export const DashboardRouter = router;
