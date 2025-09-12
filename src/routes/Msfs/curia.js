import express from 'express';
import {saveCuriaAdvisorDetails,getCuriaAdvisorDetails,getCuriaAdvisorByCode,updateCuriaAdvisorDetails,deleteCuriaAdvisorDetails,getConfreresWithDetails, getCuriaAdvisor, getAllCuriaAdvisorsForExport} from '../../controllers/Msfs/curia.js'

const router = express.Router();

router.post('/savecuriaandadvisor',saveCuriaAdvisorDetails)
router.get('/getAllCuria',getCuriaAdvisorDetails)
router.get('/getByCuriaCode/:curia_code', getCuriaAdvisorByCode);
router.put('/updateByCode/:curia_code',updateCuriaAdvisorDetails)
router.delete('/deletebycuriacode/:curia_code',deleteCuriaAdvisorDetails)
router.get('/getConfreresWithDetails',getConfreresWithDetails)
router.get('/getConfreresWithData',getConfreresWithDetails)
router.get('/curia-advisors/:curia_code',getCuriaAdvisor)
router.get('/getAllCuriaAdvisorsForExport',getAllCuriaAdvisorsForExport)

export const CuriaRouter = router;