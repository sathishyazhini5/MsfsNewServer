import { curiaAccess } from '../../middlewares/curiaAccess.js';
import express from 'express';
import {saveCuriaAdvisorDetails,getCuriaAdvisorDetails,getCuriaAdvisorByCode,updateCuriaAdvisorDetails,deleteCuriaAdvisorDetails,getConfreresWithDetails, getCuriaAdvisor, getAllCuriaAdvisorsForExport} from '../../controllers/Msfs/curia.js'

const router = express.Router();

router.post('/savecuriaandadvisor',saveCuriaAdvisorDetails)
router.get('/getAllCuria',getCuriaAdvisorDetails)
router.get('/getByCuriaCode/:curia_code', curiaAccess, getCuriaAdvisorByCode);
router.put('/updateByCode/:curia_code', curiaAccess, updateCuriaAdvisorDetails)
router.delete('/deletebycuriacode/:curia_code', curiaAccess, deleteCuriaAdvisorDetails)
router.get('/getConfreresWithDetails',getConfreresWithDetails)
router.get('/getConfreresWithData',getConfreresWithDetails)
router.get('/curia-advisors/:curia_code', curiaAccess, getCuriaAdvisor)
router.get('/getAllCuriaAdvisorsForExport',getAllCuriaAdvisorsForExport)

export const CuriaRouter = router;