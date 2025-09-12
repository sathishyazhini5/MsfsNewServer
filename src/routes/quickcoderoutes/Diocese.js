import express from 'express';
import {createDioceseQuickCode,getDiocesebyProvince,getDioceseQuickCodes} from '../../controllers/Quickcodecontroller/Diocese.js'

const router = express.Router();

router.post('/createDiocese',createDioceseQuickCode); 
router.get('/getDioceseNames',getDioceseQuickCodes)
router.get('/getDiocesebyProvince',getDiocesebyProvince)

export const DioceseRouter = router;
